<!-- When fixing a bug: -->

This PR fixes bug #.

- [ ] I've added a unit test to test for potential regressions of this bug.
- [ ] The changelog has been updated, if applicable.
- [ ] Commits in this PR are minimal and [have descriptive commit messages](https://chris.beams.io/posts/git-commit/).

<!-- When adding a new feature: -->

## New feature description

## Checklist

- [ ] All acceptance criteria are met.
- [ ] Relevant documentation, if any, has been written/updated.
- [ ] The changelog has been updated, if applicable.
- [ ] New functions/types have been exported in `index.ts`, if applicable.
- [ ] Commits in this PR are minimal and [have descriptive commit messages](https://chris.beams.io/posts/git-commit/).

<!-- When cutting a release: -->

This PR bumps the version to <version number>.

## Release Steps

1. Look at the [CHANGELOG.md](../CHANGELOG.md) to determine whether the release should be a major, minor, or patch release. Coordinate with the team to ensure the next version is agreed upon.
2. Run `npm run lerna-version -- <major|minor|patch>` with the decided on version.
3. Update the `CHANGELOG.md` to release the latest the version, and set the release date.
4. Commit the changes on a `release/vX.Y.Z` branch
5. Push to GitHub, create a PR, and merge once CI passes.
6. Create a release on GitHub for the new version, using a combination of the release notes from the `CHANGELOG.md` and the automatically generated changes.
