# Advanced Release Notes Generator

Automatically generate detailed release notes and manage changelog for your GitHub releases.

## Features
- Conventional commit parsing
- Categorized changes
- Changelog management
- Customizable templates
- Detailed statistics

## Usage
```yaml
- uses: ssoad/release-notes-action@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}