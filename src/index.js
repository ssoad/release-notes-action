const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec');
const fs = require('fs').promises;
const path = require('path');

async function run() {
  try {
    core.info('Starting release process...');
    
    // 1. Setup git
    await exec('git', ['config', '--global', '--add', 'safe.directory', process.cwd()]);
    await exec('git', ['config', 'user.name', 'github-actions[bot]']);
    await exec('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
    await exec('git', ['fetch', '--tags', '--force']);

    // 2. Get version info
    const currentTag = process.env.GITHUB_REF.replace('refs/tags/', '');
    const previousTag = await getPreviousTag();
    core.info(`Processing tags: ${previousTag} → ${currentTag}`);
    
    // 3. Generate release content
    const date = new Date().toISOString().split('T')[0];
    const releaseNotes = await generateReleaseContent(currentTag, previousTag, date);
    core.debug(`Generated release notes: ${releaseNotes}`);
    
    // 4. Update changelog
    core.info('Updating changelog...');
    await updateChangelog(releaseNotes);
    
    // 5. Commit changes
    const defaultBranch = await getDefaultBranch();
    await commitChanges(defaultBranch, currentTag);
    
    // 6. Create release
    await createRelease(currentTag, releaseNotes);
    core.info('Release process completed successfully');

  } catch (error) {
    core.error(`Failed: ${error.message}`);
    core.setFailed(error.message);
  }
}

async function getPreviousTag() {
  try {
    let output = '';
    await exec('git', ['describe', '--tags', '--abbrev=0', 'HEAD^'], {
      listeners: {
        stdout: (data) => { output += data.toString(); }
      },
      silent: true
    });
    return output.trim();
  } catch {
    return await getFirstCommit();
  }
}

async function getFirstCommit() {
  let output = '';
  await exec('git', ['rev-list', '--max-parents=0', 'HEAD'], {
    listeners: {
      stdout: (data) => { output += data.toString(); }
    },
    silent: true
  });
  return output.trim();
}

async function generateReleaseContent(currentTag, previousTag, date) {
  const sections = {
    'feat': '🚀 Features',
    'fix': '🐛 Bug Fixes',
    'docs': '📝 Documentation',
    'chore': '🧰 Maintenance',
    'deps': '📦 Dependencies',
    'refactor': '♻️ Refactoring',
    'perf': '⚡ Performance',
    'test': '🧪 Testing'
  };

  let content = `## What's Changed in [${currentTag}] - ${date}\n\n`;
  
  for (const [type, title] of Object.entries(sections)) {
    const commits = await getCommitsByType(type, previousTag, currentTag);
    if (commits.trim()) {
      content += `### ${title}\n${commits}\n\n`;
    }
  }

  // Add statistics
  const stats = await generateStats(previousTag, currentTag);
  content += stats;
  
  return content;
}

async function getCommitsByType(type, previousTag, currentTag) {
  let output = '';
  try {
    await exec('git', [
      'log',
      `${previousTag}..${currentTag}`,
      '--pretty=format:- %s',
      `--grep=^${type}`
    ], {
      listeners: {
        stdout: (data) => {
          output += data.toString()
            .replace(new RegExp(`^- ${type}(\\([^)]*\\))?:\\s*`, 'gm'), '- ')
            .replace(/^- /, '- ' + output.charAt(2).toUpperCase() + output.slice(3));
        }
      },
      silent: true
    });
  } catch (error) {
    core.warning(`Error getting commits for type ${type}: ${error.message}`);
  }
  return output;
}

async function generateStats(previousTag, currentTag) {
  const repo = `${github.context.repo.owner}/${github.context.repo.repo}`;
  let stats = '### 📝 Details\n\n<details>\n<summary>View Changes</summary>\n\n';
  stats += '📊 **Statistics**\n';
  
  let commits = '0', files = '0';
  
  try {
    let output = '';
    await exec('git', ['rev-list', '--count', `${previousTag}..${currentTag}`], {
      listeners: { stdout: (data) => { output += data.toString(); } }
    });
    commits = output.trim();
  } catch (error) {
    core.warning(`Error getting commit count: ${error.message}`);
  }
  
  try {
    let output = '';
    await exec('git', ['diff', '--name-only', previousTag, currentTag], {
      listeners: { stdout: (data) => { output += data.toString(); } }
    });
    files = output.trim().split('\n').filter(Boolean).length.toString();
  } catch (error) {
    core.warning(`Error getting changed files: ${error.message}`);
  }
  
  stats += `- Commits: \`${commits}\`\n`;
  stats += `- Files changed: \`${files}\`\n\n`;
  stats += '🔍 **Compare Changes**\n';
  stats += `[\`${previousTag} → ${currentTag}\`](https://github.com/${repo}/compare/${previousTag}...${currentTag})\n`;
  stats += '</details>\n\n';
  stats += `[${currentTag}]: https://github.com/${repo}/releases/tag/${currentTag}\n`;
  
  return stats;
}

async function updateChangelog(content) {
  const changelogPath = 'CHANGELOG.md';
  let changelog = '';
  
  try {
    changelog = await fs.readFile(changelogPath, 'utf8');
    core.info('Existing changelog found');
  } catch (error) {
    if (error.code === 'ENOENT') {
      changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
      core.info('Creating new changelog');
    } else {
      throw error;
    }
  }
  
  const lines = changelog.split('\n');
  const header = lines.slice(0, 4).join('\n');
  const existingContent = lines.slice(4).join('\n');
  
  core.debug('Writing updated changelog');
  await fs.writeFile(changelogPath, `${header}\n${content}\n${existingContent}`);
  core.info('Changelog updated successfully');
}

async function getDefaultBranch() {
  let output = '';
  await exec('git', ['rev-parse', '--abbrev-ref', 'origin/HEAD'], {
    listeners: { stdout: (data) => { output += data.toString(); } }
  });
  return output.trim().replace('origin/', '');
}

async function commitChanges(branch, tag) {
  await exec('git', ['add', 'CHANGELOG.md']);
  
  const hasChanges = await exec('git', ['diff', '--staged', '--quiet'], 
    { ignoreReturnCode: true }
  ) !== 0;
  
  if (hasChanges) {
    core.info('Changes detected, committing...');
    await exec('git', ['checkout', '-B', branch]);
    await exec('git', ['commit', '-m', `docs: update changelog for ${tag}`]);
    await exec('git', ['push', '-f', 'origin', branch]);
    core.info('Changes committed and pushed');
  } else {
    core.info('No changes to commit');
  }
}

async function createRelease(tag, body) {
  const token = core.getInput('github_token');
  const octokit = github.getOctokit(token);
  
  core.info('Creating GitHub release...');
  const release = await octokit.rest.repos.createRelease({
    ...github.context.repo,
    tag_name: tag,
    name: `Release ${tag}`,
    body,
    draft: false,
    prerelease: false
  });
  
  core.info(`Release created: ${release.data.html_url}`);
  core.setOutput('release_url', release.data.html_url);
}

if (require.main === module) {
  run();
}

module.exports = run;