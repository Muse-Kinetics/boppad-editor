<!-- buddy:visibility=public -->
# Mission

BopPad Editor Monorepo is the consolidated JavaScript workspace for the BopPad editor stack. It brings the BopPad editor to the same modernized architecture as the K-Board editor: one npm-workspaces monorepo containing the browser editor, the Electron desktop editor, and a shared headless device/firmware package, on a current Electron/Node/toolchain, with chunked local-first firmware updates, MPL-2.0 licensing, and GitHub-Releases publishing.

This was a **migration**, now shipped: **v1.2.0 is the first public release**, hardware-validated on both macOS and Windows, published to `Muse-Kinetics/boppad-editor` on GitHub (desktop installers for both platforms + web editor deployed to production), as of 2026-08-05/06. It replaced two separate legacy Bitbucket repos (`00_Editors/BopPad/Browser` and `00_Editors/BopPad/Desktop`) that had drifted apart (the desktop shell embedded a hand-copied `bundle.js`, and firmware versions diverged: Browser 3.0.2 / Desktop 3.0.1). The reference architecture was the completed `../../K-Board/k-board-editor-monorepo` and its squashed public repo `Muse-Kinetics/k-board-editor`. The project is now in ongoing maintenance, not active migration — see `current-task.md` for what's left (macOS rebuild on the Mac machine) and `decisions.md`/`blockers.md` for how v1.2.0 got shipped.

Durable project state must live in this repository (`.buddy-project/` + `README.md`) so any human or agent can resume work without depending on chat history.

## Goals

- Maintain a working BopPad editor on both web and desktop from one install/build surface (kills the old `bundle.js` copy + drift).
- Make firmware updates reliable and offline-capable: local-first bundled firmware, split into SysEx packets and sent chunked with a between-chunk identity handshake (mirroring the hardware-validated `mk_firmware_tester` protocol).
- Modernize the toolchain (Electron 13 → 28, Node 24, drop Bower/vendored `lib/`, replace deprecated webpack plugins) **without** rewriting the app — keep the jQuery UI.
- Relicense to MPL-2.0 and prepare a clean, history-free, `.env`-free squash into private `Muse-Kinetics/boppad-editor`.
- Preserve enough operational context in `.buddy-project/` that a replacement agent can resume cleanly.

## Constraints

- Node 24 is the baseline (`engines.node >= 24`). The machine's nvm default is v13, which fails on modern syntax — Node 24 must be selected explicitly (see commands.md).
- Desktop packaging **requires `electron-builder ^23.0.3`** — 24.x ships a `7zip-bin` with a `chmod 7za` ENOENT bug that fails the mac build. K-Board uses 23.6.
- The repo lives in Dropbox, which dehydrates `node_modules` to online-only placeholders and breaks builds; pause Dropbox and do a clean reinstall when modules go missing (see blockers.md).
- Signing and notarization credentials live only in the gitignored `.env`. It must never be committed, and must never be included in a release archive.
- The desktop app must retain a bundled firmware fallback and must not require a web connection to flash firmware.
- Firmware flashing changes are **device-critical and cannot be validated without a physical BopPad**. The v1.2.0 chunked path IS hardware-validated (macOS 2026-08-03, Windows 2026-08-04/05 — see decisions.md/blockers.md) — but this constraint still applies to any *future* firmware-path change: never describe a change to `packages/boppad-js-api` or `firmwareUpdater.js` as working until it's actually run on a physical device.

## Architectural Direction

```
boppad-editor-monorepo/          (npm workspaces, Node 24, MPL-2.0)
  apps/web/                      jQuery editor on a clean modern webpack build (no Bower)
  apps/desktop/                  Electron 28 shell; consumes the web build via scripts/sync-renderer.js
  packages/boppad-js-api/        headless device layer: SysEx chunking codec + chunked firmware sender
  firmware/                      single source of truth: chunked _cs128 .syx + bootloader .syx + manifest
  LICENSE NOTICE ...
```

- `apps/desktop` builds and consumes the `apps/web` output (`scripts/sync-renderer.js` → `renderer/`) instead of a hand-copied `bundle.js` — this is what removes the historical drift.
- The top-level `firmware/` directory is the source of truth; webpack copies it into `build/firmware` (and thence `renderer/firmware`), so the bundled copy loads relative to the app over both `https` and `file://`.
- A shared `packages/editor-core` (React shell, as in K-Board) is **NOT** created — BopPad keeps its jQuery UI; a React port is out of scope unless a compelling need appears.
- `.buddy-project/` files are the canonical operational memory for this repository; `CLAUDE.md` and `.github/copilot-instructions.md` are adapters only.
