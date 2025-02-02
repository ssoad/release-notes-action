const { exec } = require('@actions/exec');
const core = require('@actions/core');

async function generateReleaseNotes(currentTag) {
  const previousTag = await getPreviousTag();
  const sections = {
    '🚀 Features': 'feat',
    '🐛 Bug Fixes': 'fix',
    '📝 Documentation': 'docs',
    '🧰 Maintenance': 'chore',
    '📦 Dependencies': 'deps',
    '♻️ Refactoring': 'refactor',
    '⚡ Performance': 'perf',
    '🧪 Testing': 'test'
  };

  let notes = `## What's Changed in ${currentTag}\n\n`;

  for (const [title, pattern] of Object.entries(sections)) {
    const commits = await getCommitsByType(pattern, previousTag, currentTag);
    if (commits) {
      notes += `### ${title}\n${commits}\n\n`;
    }
  }

  return notes;
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

async function getPreviousTag() {
  let output = '';
  await exec('git', ['describe', '--tags', '--abbrev=0', 'HEAD^'], {
    listeners: {
      stdout: (data) => {
        output += data.toString();
      }
    },
    silent: true
  });
  return output.trim() || await getFirstCommit();
}

async function getFirstCommit() {
  let output = '';
  await exec('git', ['rev-list', '--max-parents=0', 'HEAD'], {
    listeners: {
      stdout: (data) => {
        output += data.toString();
      }
    },
    silent: true
  });
  return output.trim();
}

module.exports = { generateReleaseNotes };