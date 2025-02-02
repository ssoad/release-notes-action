const core = require('@actions/core');
const github = require('@actions/github');
const { updateChangelog } = require('./changelog');
const { generateReleaseNotes } = require('./generator');
const { exec } = require('@actions/exec');

async function run() {
  try {
    // Setup git config
    await exec('git', ['config', 'user.name', 'github-actions[bot]']);
    await exec('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);

    const inputs = {
      token: core.getInput('token'),
      tagName: core.getInput('tag_name') || github.context.ref.replace('refs/tags/', ''),
      changelogFile: core.getInput('changelog_file') || 'CHANGELOG.md'
    };

    // Generate and update
    const releaseNotes = await generateReleaseNotes(inputs.tagName);
    await updateChangelog(inputs.changelogFile, releaseNotes);

    // Commit changes
    const hasChanges = await exec('git', ['diff', '--staged', '--quiet'], 
      { ignoreReturnCode: true }
    );
    
    if (hasChanges !== 0) {
      await exec('git', ['commit', '-m', `docs: update changelog for ${inputs.tagName}`]);
      await exec('git', ['push']);
    }

    // Create release
    const octokit = github.getOctokit(inputs.token);
    const release = await octokit.rest.repos.createRelease({
      ...github.context.repo,
      tag_name: inputs.tagName,
      name: `Release ${inputs.tagName}`,
      body: releaseNotes,
      draft: false,
      prerelease: false
    });

    core.setOutput('release_url', release.data.html_url);
    core.setOutput('changelog_updated', 'true');

  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;

if (require.main === module) {
  run();
}