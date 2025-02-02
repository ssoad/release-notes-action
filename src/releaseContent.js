const { exec } = require('@actions/exec');
const core = require('@actions/core');
const github = require('@actions/github');

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
    const commits = await getCommitsByTypeWithoutLinks(type, previousTag, currentTag);
    if (commits.trim()) {
      content += `### ${title}\n${commits}\n\n`;
    }
  }

  // Add statistics
  const stats = await generateStats(previousTag, currentTag);
  content += stats;
  
  return content;
}

async function generateChangelogContent(currentTag, previousTag, date) {
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
  const repoUrl = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}`;
  let output = '';
  try {
    await exec('git', [
      'log',
      `${previousTag}..${currentTag}`,
      '--pretty=format:%H %s',
      `--grep=^${type}`
    ], {
      listeners: {
        stdout: (data) => {
          const commits = data.toString().trim().split('\n');
          for (const commit of commits) {
            const [hash, ...messageParts] = commit.split(' ');
            let message = messageParts.join(' ')
              .replace(new RegExp(`^${type}(\\([^)]*\\))?:\\s*`, 'i'), '')
              .replace(/^./, str => str.toUpperCase());
            output += `- ${message} ([${hash.substring(0, 7)}](${repoUrl}/commit/${hash}))\n`;
          }
        }
      },
      silent: true
    });
  } catch (error) {
    core.warning(`Error getting commits for type ${type}: ${error.message}`);
  }
  return output;
}

async function getCommitsByTypeWithoutLinks(type, previousTag, currentTag) {
  let output = '';
  try {
    await exec('git', [
      'log',
      `${previousTag}..${currentTag}`,
      '--pretty=format:%s',
      `--grep=^${type}`
    ], {
      listeners: {
        stdout: (data) => {
          const commits = data.toString().trim().split('\n');
          for (const commit of commits) {
            let message = commit
              .replace(new RegExp(`^${type}(\\([^)]*\\))?:\\s*`, 'i'), '')
              .replace(/^./, str => str.toUpperCase());
            output += `- ${message}\n`;
          }
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

module.exports = {
  generateReleaseContent,
  generateChangelogContent,
  getCommitsByType,
  getCommitsByTypeWithoutLinks,
  generateStats
};