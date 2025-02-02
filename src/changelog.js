const fs = require('fs').promises;
const core = require('@actions/core');
const { exec } = require('@actions/exec');

async function updateChangelog(filePath, content) {
  try {
    // Ensure content is properly formatted
    const formattedContent = content.trim() + '\n\n';
    
    // Read existing changelog or create new
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

    // Split header and content
    const lines = changelog.split('\n');
    const header = lines.slice(0, 4).join('\n');
    const existingContent = lines.slice(4).join('\n');

    // Combine content
    const updatedChangelog = `${header}\n${formattedContent}${existingContent}`;

    // Write back to file
    await fs.writeFile(filePath, updatedChangelog, 'utf8');

    // Stage changes
    await exec('git', ['add', filePath]);
    
    return true;
  } catch (error) {
    core.error(`Failed to update changelog: ${error.message}`);
    throw error;
  }
}

module.exports = { updateChangelog };