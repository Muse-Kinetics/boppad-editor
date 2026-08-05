# Releasing the BopPad Editor

Desktop releases are published to **GitHub Releases** on
`Muse-Kinetics/boppad-editor`. The desktop app's auto-updater
(`electron-updater`) reads from there, because `apps/desktop/package.json`
declares the GitHub publish provider:

```json
"build": { "publish": [{ "provider": "github", "owner": "Muse-Kinetics", "repo": "boppad-editor" }] }
```

Core principle (same as the K-Board editor): **build and test the installers
locally, then publish the exact artifacts you tested.** Nothing is uploaded during
the build — publishing is a separate, deliberate step.

## Prerequisites

- Node 24 (`nvm use`), a clean `npm install`.
- The `gh` CLI, authenticated with write access to `Muse-Kinetics/boppad-editor`.
- **macOS builds:** the `Developer ID Application` signing identity in your
  keychain, and `APPLE_KEYCHAIN_PROFILE` set to a stored `xcrun notarytool`
  profile (keep it in a gitignored `.env`).
- **Windows builds:** a local `signtool.exe` (see `signWindows.js`).

Before any release: bump the version in the app `package.json` files, update the
changelog, and confirm the version is strictly greater than everything already
published.

## macOS

Run from `apps/desktop`:

```bash
# 1. Build a signed, notarized, stapled universal DMG (does NOT publish)
npm run package-mac-dist
#    → release/BopPad Editor-<version>-universal.dmg (+ .blockmap, latest-mac.yml)
#    For a quick local check without notarization: npm run package-mac

# 2. TEST IT: mount the DMG, install, launch, verify it runs.

# 3. Publish the tested artifacts to a GitHub Release
npm run publish-github-mac      # add -- --draft to stage a hidden draft first
```

`package-mac-dist` regenerates `latest-mac.yml` and the blockmap from the *final*
signed+stapled DMG, so the auto-update checksums always match the shipped file.

## Windows

Run from `apps/desktop` on a Windows machine:

```bash
# 1. Build a signed NSIS installer (does NOT publish)
npm run package-win
#    → release/BopPad Editor Setup <version>.exe (+ .blockmap, latest.yml)

# 2. TEST IT: run the installer, launch the app, verify signatures:
#    signtool verify /pa /all /v "release/BopPad Editor Setup <version>.exe"

# 3. Publish the tested artifacts to the same GitHub Release
npm run publish-github-win
```

## Notes

- `publish-github-*` upload to the release tagged `v<version>`, creating it if
  needed. Re-running replaces that platform's assets, so mac and win can be
  published independently to the same release.
- Publishing is done via `gh` (not electron-builder's build-time `--publish`) so
  the notarized/tested mac DMG is exactly what ships — electron-builder would
  otherwise upload the DMG before notarization.
- Firmware is bundled locally (`firmware/`, chunked `.syx`); it is not a runtime
  web dependency. Update *checks* flow through the GitHub Releases feed.
