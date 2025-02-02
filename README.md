# Advanced Release Notes Generator

Automatically generate detailed release notes and manage changelog for your GitHub releases.

## Features
- 🚀 **Conventional commit parsing**: Automatically parse conventional commits.
- 📂 **Categorized changes**: Organize changes into categories like Features, Bug Fixes, Documentation, etc.
- 📝 **Changelog management**: Update your changelog with the latest changes.
- 🎨 **Customizable templates**: Customize the release notes and changelog templates.
- 📊 **Detailed statistics**: Include detailed statistics in your release notes.

## Usage

To use this action, add the following step to your GitHub Actions workflow:

```yaml
- uses: ssoad/release-notes-action@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    tag_name: ${{ github.ref }}
    draft: false
    prerelease: false
    changelog_file: 'CHANGELOG.md'

```

## Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `token` | GitHub token | `true` | - |
| `tag_name` | Tag name of the release | `true` | - |
| `draft` | Create a draft release | `false` | `false` |
| `prerelease` | Create a prerelease | `false` | `false` |
| `changelog_file` | Path to the changelog file | `false` | `CHANGELOG.md` |

## Outputs

| Name | Description |
| --- | --- |
| `release_url` | URL of the created release |
| `changelog_updated` | Changelog update status |

## Example Workflow

```yaml
name: Release Notes & Changelog Generator
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

env:
  ACTIONS_STEP_DEBUG: true

permissions:
  contents: write

jobs:
  update-release-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

 
      - name: Generate Release Notes
        uses: ssoad/release-notes-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```


## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
