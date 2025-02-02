const fs = require('fs').promises;
const core = require('@actions/core');

async function updateChangelog(filePath, content) {
  try {
    core.debug(`Updating changelog at: ${filePath}`);
    
    // Read existing content
    let changelog = '';
    try {
      changelog = await fs.readFile(filePath, 'utf8');
      core.debug(`Existing changelog content: ${changelog}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
        core.info('Created new changelog file');
      } else {
        throw error;
      }
    }

    // Format new content
    const formattedContent = content.trim() + '\n\n';
    core.debug(`Formatted new content: ${formattedContent}`);

    // Split and combine content
    const lines = changelog.split('\n');
    const header = lines.slice(0, 4).join('\n');
    const existingContent = lines.slice(4).join('\n');
    const updatedChangelog = `${header}\n${formattedContent}${existingContent}`;

    // Write updated content
    await fs.writeFile(filePath, updatedChangelog, 'utf8');
    core.debug(`Written updated changelog`);

    return true;
  } catch (error) {
    core.error(`Changelog update failed: ${error.message}`);
    throw error;
  }
}

module.exports = { updateChangelog };