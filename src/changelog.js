const fs = require('fs').promises;
const core = require('@actions/core');

async function updateChangelog(filePath, content) {
  try {
    let changelog = '';
    try {
      changelog = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
      } else {
        throw error;
      }
    }

    const updatedChangelog = changelog.replace(/^(# Changelog\n\n)/, `$1${content}\n`);
    await fs.writeFile(filePath, updatedChangelog);
    
  } catch (error) {
    core.warning(`Failed to update changelog: ${error.message}`);
  }
}

module.exports = { updateChangelog };