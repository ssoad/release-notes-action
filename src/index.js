const core = require('@actions/core');
const github = require('@actions/github');
const { generateReleaseNotes } = require('./generator');
const { updateChangelog } = require('./changelog');

async function run() {
  try {
    // 1. Get action inputs
    const inputs = {
      token: core.getInput('token'),
      tagName: core.getInput('tag_name') || github.context.ref.replace('refs/tags/', ''),
      draft: core.getInput('draft') === 'true',
      prerelease: core.getInput('prerelease') === 'true',
      changelogFile: core.getInput('changelog_file') || 'CHANGELOG.md'
    };

    // 2. Generate release notes
    const releaseNotes = await generateReleaseNotes(inputs.tagName);

    // 3. Update changelog
    await updateChangelog(inputs.changelogFile, releaseNotes);

    // 4. Create GitHub release
    const octokit = github.getOctokit(inputs.token);
    const release = await octokit.rest.repos.createRelease({
      ...github.context.repo,
      tag_name: inputs.tagName,
      name: `Release ${inputs.tagName}`,
      body: releaseNotes,
      draft: inputs.draft,
      prerelease: inputs.prerelease
    });

    // 5. Set outputs
    core.setOutput('release_url', release.data.html_url);
    core.setOutput('changelog_updated', 'true');

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();