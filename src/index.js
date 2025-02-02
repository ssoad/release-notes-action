const core = require('@actions/core');
const github = require('@actions/github');
const { setupGit, getPreviousTag, getDefaultBranch, commitChanges } = require('./git');
const { updateChangelog } = require('./changelog');
const { generateReleaseContent, generateChangelogContent } = require('./releaseContent');

async function run() {
  try {
    core.info('Starting release process...');
    
    // 1. Setup git
    await setupGit();

    // 2. Get version info
    const currentTag = core.getInput('tag_name') || process.env.GITHUB_REF.replace('refs/tags/', '');
    const previousTag = await getPreviousTag();
    core.info(`Processing tags: ${previousTag} → ${currentTag}`);
    
    // 3. Generate release content
    const date = new Date().toISOString().split('T')[0];
    const releaseNotes = await generateReleaseContent(currentTag, previousTag, date);
    core.debug(`Generated release notes: ${releaseNotes}`);
    
    // 4. Update changelog
    core.info('Updating changelog...');
    const changelogPath = core.getInput('changelog_file') || 'CHANGELOG.md';
    const changelogContent = await generateChangelogContent(currentTag, previousTag, date);
    await updateChangelog(changelogContent, changelogPath);
    
    // 5. Commit changes
    const defaultBranch = await getDefaultBranch();
    await commitChanges(defaultBranch, currentTag, changelogPath);
    
    // 6. Create release
    await createRelease(currentTag, releaseNotes);
    core.info('Release process completed successfully');

  } catch (error) {
    core.error(`Failed: ${error.message}`);
    core.setFailed(error.message);
  }
}

async function createRelease(tag, body) {
  const token = core.getInput('token');
  const draft = core.getInput('draft') === 'true';
  const prerelease = core.getInput('prerelease') === 'true';
  core.debug(`GitHub token: ${token ? 'retrieved' : 'not retrieved'}`);
  const octokit = github.getOctokit(token);
  
  core.info('Creating GitHub release...');
  const release = await octokit.rest.repos.createRelease({
    ...github.context.repo,
    tag_name: tag,
    name: `Release ${tag}`,
    body,
    draft,
    prerelease
  });
  
  core.info(`Release created: ${release.data.html_url}`);
  core.setOutput('release_url', release.data.html_url);
}

if (require.main === module) {
  run();
}

module.exports = run;