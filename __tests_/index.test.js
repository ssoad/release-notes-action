const { generateReleaseNotes } = require('../src/generator');
const { updateChangelog } = require('../src/changelog');
const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec');

// Mock dependencies
jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('@actions/exec');

describe('Release Notes Action', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock GitHub context
    github.context = {
      repo: {
        owner: 'ssoad',
        repo: 'test-repo'
      },
      ref: 'refs/tags/v1.0.0'
    };
  });

  test('generates release notes from commits', async () => {
    // Mock git commands
    exec.mockImplementation((cmd, args, opts) => {
      if (args.includes('describe')) {
        opts.listeners.stdout('v0.9.0\n');
      } else if (args.includes('log')) {
        opts.listeners.stdout('- feat: add new feature\n- fix: resolve bug\n');
      }
      return Promise.resolve(0);
    });

    const notes = await generateReleaseNotes('v1.0.0');
    expect(notes).toContain('### 🚀 Features');
    expect(notes).toContain('Add new feature');
    expect(notes).toContain('### 🐛 Bug Fixes');
    expect(notes).toContain('Resolve bug');
  });

  test('updates changelog file', async () => {
    const mockNotes = '## v1.0.0\n\n- New feature\n';
    const mockChangelog = '# Changelog\n\nOld content';
    
    const fs = require('fs').promises;
    jest.spyOn(fs, 'readFile').mockResolvedValue(mockChangelog);
    jest.spyOn(fs, 'writeFile').mockResolvedValue();

    await updateChangelog('CHANGELOG.md', mockNotes);
    
    expect(fs.writeFile).toHaveBeenCalledWith(
      'CHANGELOG.md',
      expect.stringContaining(mockNotes)
    );
  });

  test('handles missing changelog file', async () => {
    const fs = require('fs').promises;
    jest.spyOn(fs, 'readFile').mockRejectedValue({ code: 'ENOENT' });
    jest.spyOn(fs, 'writeFile').mockResolvedValue();

    await updateChangelog('CHANGELOG.md', 'New content');
    
    expect(fs.writeFile).toHaveBeenCalledWith(
      'CHANGELOG.md',
      expect.stringContaining('# Changelog')
    );
  });

  test('handles error in release creation', async () => {
    const error = new Error('API error');
    github.getOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          createRelease: jest.fn().mockRejectedValue(error)
        }
      }
    }));

    await expect(async () => {
      await require('../src/index')();
    }).rejects.toThrow();
    
    expect(core.setFailed).toHaveBeenCalledWith(error.message);
  });
});