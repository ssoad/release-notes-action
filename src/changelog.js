const fs = require('fs').promises;
const core = require('@actions/core');

async function updateChangelog(content, changelogPath = 'CHANGELOG.md') {
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

module.exports = {
  updateChangelog
};