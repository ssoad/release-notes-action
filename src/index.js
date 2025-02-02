const fs = require('fs').promises;
const path = require('path');

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

    // Debug logging
    core.debug(`Working directory: ${process.cwd()}`);
    core.debug(`Changelog file: ${inputs.changelogFile}`);

    // Verify file exists or create it
    const changelogPath = path.resolve(inputs.changelogFile);
    try {
      await fs.access(changelogPath);
    } catch {
      core.info('Creating new changelog file');
      await fs.writeFile(changelogPath, '# Changelog\n\n');
    }

    // Generate and update
    const releaseNotes = await generateReleaseNotes(inputs.tagName);
    core.debug(`Generated release notes: ${releaseNotes}`);
    
    await updateChangelog(inputs.changelogFile, releaseNotes);
    
    // Verify changelog was updated
    const changelogContent = await fs.readFile(changelogPath, 'utf8');
    core.debug(`Updated changelog content: ${changelogContent}`);

    // Stage changes explicitly
    await exec('git', ['add', inputs.changelogFile]);

    // Check for changes with better error handling
    let hasChanges = false;
    try {
      const result = await exec('git', ['diff', '--staged', '--quiet'], 
        { ignoreReturnCode: true }
      );
      hasChanges = result !== 0;
    } catch (error) {
      core.warning(`Git diff check failed: ${error.message}`);
      hasChanges = true;
    }
    
    if (hasChanges) {
      core.info('Changes detected, committing...');
      await exec('git', ['commit', '-m', `docs: update changelog for ${inputs.tagName}`]);
      await exec('git', ['push', 'origin', 'HEAD']);
    } else {
      core.info('No changes to commit');
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
    core.setOutput('changelog_updated', hasChanges.toString());

  } catch (error) {
    core.error(`Failed with error: ${error.message}`);
    core.error(`Stack trace: ${error.stack}`);
    core.setFailed(error.message);
  }
}