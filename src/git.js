const { exec } = require('@actions/exec');

async function setupGit() {
  await exec('git', ['config', '--global', '--add', 'safe.directory', process.cwd()]);
  await exec('git', ['config', 'user.name', 'github-actions[bot]']);
  await exec('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
  await exec('git', ['fetch', '--tags', '--force']);
}

async function getPreviousTag() {
  try {
    let output = '';
    await exec('git', ['describe', '--tags', '--abbrev=0', 'HEAD^'], {
      listeners: {
        stdout: (data) => { output += data.toString(); }
      },
      silent: true
    });
    return output.trim();
  } catch {
    return await getFirstCommit();
  }
}

async function getFirstCommit() {
  let output = '';
  await exec('git', ['rev-list', '--max-parents=0', 'HEAD'], {
    listeners: {
      stdout: (data) => { output += data.toString(); }
    },
    silent: true
  });
  return output.trim();
}

async function getDefaultBranch() {
  let output = '';
  await exec('git', ['rev-parse', '--abbrev-ref', 'origin/HEAD'], {
    listeners: { stdout: (data) => { output += data.toString(); } }
  });
  return output.trim().replace('origin/', '');
}

async function commitChanges(branch, tag, changelogFile) {
  await exec('git', ['add', changelogFile]);
  
  const hasChanges = await exec('git', ['diff', '--staged', '--quiet'], 
    { ignoreReturnCode: true }
  ) !== 0;
  
  if (hasChanges) {
    await exec('git', ['checkout', branch]);
    await exec('git', ['commit', '-m', `docs: update changelog for ${tag}`]);
    await exec('git', ['push', 'origin', branch]);
  }
}

module.exports = {
  setupGit,
  getPreviousTag,
  getFirstCommit,
  getDefaultBranch,
  commitChanges
};