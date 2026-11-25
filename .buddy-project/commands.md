<!-- buddy:visibility=public -->
# Commands

Operational commands for building, testing, running, and packaging BopPad Editor Monorepo.

## VS Code Tooling (added 2026-08-04)

`.vscode/tasks.json` wires every command below into VS Code's Terminal → Run Task
menu, prefixed `BopPad:` so they're findable in a larger multi-root workspace.
`.vscode/launch.json` adds one F5-debuggable config for the Electron main process
(`BopPad: Debug Desktop (Electron Main)`).

- Windows-installer and macOS-installer tasks are all present regardless of which
  OS you're on (this repo is worked on from both Windows and Mac via Dropbox) —
  only run the ones matching your current machine.
- The two web-deploy tasks and the build-and-deploy task load the
  root `.env` via `dotenv-cli` (`npx dotenv -e .env -- ...`) since
  `apps/web/scripts/deploy-build.js` doesn't self-load `.env` the way the desktop
  release scripts do — see decisions.md. Verified working end-to-end (dry-run).
- The Windows unsigned-installer task sets `KB_SKIP_WINDOWS_SIGN=1` directly via
  the task's own `options.env`, not a wrapper script — `signWindows.js` already
  honors that var. No separate `package-win-unsigned` npm script was added.
- `.env` now also carries `BP_WEB_SSH_SERVER`/`BP_WEB_SSH_LOCATION` (the deploy target, which
  the deploy script reads from the environment) so the deploy
  tasks are actually runnable, not just wired.

## Buddy Procedure

- Read `README.md`, `.buddy-project/mission.md`, `.buddy-project/current-task.md`, `.buddy-project/blockers.md`, and `.buddy-project/commands.md` before substantial work.
- Record durable decisions in `.buddy-project/decisions.md`; keep `.buddy-project/current-task.md` + `blockers.md` current before stopping.
- Treat `CLAUDE.md` and `.github/copilot-instructions.md` as adapters only — neither is a source of truth.

## Environment / Prereqs

- **Node 24 is required.** The machine default (nvm) is v13 and will fail. Select Node 24 first:
  - `nvm use` in the repo root (reads `.nvmrc` = 24), OR
  - put it on PATH directly: `export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"`
- **Pause Dropbox before installing/building** if `node_modules` looks dehydrated (missing-module / missing-`7za` errors). Then `rm -rf node_modules && npm install` while paused. See blockers.md.
- **`electron-builder` must stay `^23.0.3`** (24.x breaks the mac build). See decisions.md.
- Repository: `git@github.com:Muse-Kinetics/boppad-editor.git` — **live**, `main` tagged `v1.2.0` at `e5ab1d6` with a public GitHub Release (mac + Windows assets); 1.3.0 work sits on top of it. Every future commit/push/force-push/tag move still needs the owner's explicit approval (see guidelines.md) — **and in this environment, Claude Code's auto-mode classifier blocks those git operations outright even with approval already given**, so hand the exact command to the owner to run via `!<command>` rather than expecting to run it directly.

## Root Build / Run (npm workspaces)

- `npm install` — install + link workspaces (`apps/*`, `packages/*`; symlinks `boppad-js-api` into `node_modules/`).
- `npm run build:web` — build the web app (`boppad-editor`).
- `npm run start:web` — start the web dev server (`webpack serve`, HTTPS on :9000 — Web MIDI needs a secure context).
- `npm run build:desktop` — build web then sync into the desktop `renderer/` (`boppad-editor-desktop`).
- `npm run start:desktop` — sync-renderer then launch Electron.
- `npm run deploy:web` — scp the existing `apps/web/build/` to the host (upload/overwrite, no delete).
- `npm run build:deploy:web` — build then deploy in one step.
- `npm run deploy:web -- --dry-run` — preview the deploy without uploading.
- `npm run deploy:web:dev` / `npm run build:deploy:web:dev` — same, against the optional `dev` target.

## Web Workspace (`apps/web`)

- `npm run build` → `NODE_ENV=production webpack --config webpack.production.config.js` (output → `build/`, copies top-level `firmware/` → `build/firmware`).
- `npm run start` → `webpack serve --config webpack.config.js` (HTTPS dev server, :9000). Localhost is a secure context, so Web MIDI works; the self-signed cert prompts a one-time browser trust.
- `npm run deploy` → `node ./scripts/deploy-build.js` — scp `build/`'s contents to `BP_WEB_SSH_SERVER:BP_WEB_SSH_LOCATION`, then best-effort chgrp/chmod. **Upload/overwrite only, never `--delete`** — the live editor dir holds siblings the build doesn't produce (`factoryPresets*.json`, `mac/`, `win/`, `web/`, `BopPadEditorWIN.zip`) that must survive. Accepts `--dry-run` and `--target dev`. **Also generates and uploads `products/boppad/firmware/currentVersion.json`** (a sibling path, not part of `build/`) — the file `checkFirmware.js`'s online update-check reads — from `apps/web/package.json`'s version + root `firmware/currentVersion.json`'s firmware version, so it can't drift stale like the old hand-maintained copy did. See decisions.md.
- `npm run build:deploy` / `npm run build:deploy:dev` → build then deploy.
- **No `PUBLIC_URL`/publicPath rewrite step is needed** — BopPad's build uses relative asset paths (`src="bundle.js"`, `firmware/…`), so one build is portable to the hosted subdirectory (unlike CRA-based K-Board, which bakes `PUBLIC_URL` in and needs a `build-for-deploy.js`).

## Desktop Workspace (`apps/desktop`)

- `npm run build` → `node ./scripts/sync-renderer.js` (builds web, copies `apps/web/build` → `apps/desktop/renderer/`, incl. `renderer/firmware`).
- `npm run start` → sync-renderer then `electron .`.
- `npm run package-mac` → `release-mac.js --skip-notarize` — universal build, sign app + DMG, **skip** notarization. VERIFIED (167 MB signed universal DMG).
- `npm run package-mac-dist` → `release-mac.js` — full: build, sign app, package DMG, sign DMG, notarize, staple, regenerate channel metadata.
- `npm run notarize-dmg` → `release-mac.js --skip-build --skip-package` — sign/notarize/staple an existing DMG.
- `npm run package-win` → `npm run build && electron-builder build --win --x64 --publish never` — signed NSIS (needs local `signtool.exe`; `win.sign` → `./signWindows.js`).
- `npm run publish-github-mac` → `node publish-github.js --platform mac` — publish mac artifacts to GitHub Releases (`Muse-Kinetics/boppad-editor`).
- `npm run publish-github-win` → `node publish-github.js --platform win` — publish Windows artifacts to GitHub Releases.

## Firmware Package (`packages/boppad-js-api`)

- `npm test` (from the package dir) → `node --test` — runs the chunking/sender unit tests against the real firmware image. **9/9 must pass.** (Requires Node 24; v13 lacks `--test`.)

## Required Environment Variables

- `BP_WEB_SSH_SERVER` / `BP_WEB_SSH_LOCATION` — web deploy target (`user@host`, and the absolute path to the directory the site serves). Set both in the local `.env`; the live values are not recorded in this repository. Optional `BP_WEB_<TARGET>_SSH_*` (e.g. `DEV`) and `BP_WEB_REMOTE_GROUP` (default `www-data`). The shared `KB_WEB_*` / `KB_*` vars are honored as fallbacks. See `.env.example`. Source before deploying: `set -a; source .env; set +a`.
- `APPLE_KEYCHAIN_PROFILE` — stored `xcrun notarytool` keychain profile for notarization (see `apps/desktop/.env.example`). If there's no `.env` on the machine, pass it inline: `APPLE_KEYCHAIN_PROFILE=<profile> npm run package-mac-dist`. Check the profile and Apple account first with `xcrun notarytool history --keychain-profile <profile>`; a 403 means the developer agreement needs accepting.
- GitHub token for `publish-github.js` (e.g. `GH_TOKEN` / `GITHUB_TOKEN`) — for GitHub Releases publishing.
- Apple notarization credentials live in the gitignored `.env`. Keep them local; never commit `.env`.
- The deploy needs key-based SSH to the target host, working non-interactively from the deploying machine.

## Known Validation Commands (what's actually been run green here)

- `npm install` (Node 24, Dropbox paused) — clean.
- `npm run build --workspace boppad-editor` — clean (bundles `boppad-js-api` + firmware).
- `npm run build:desktop` — clean (renderer synced, firmware present).
- `npm test` in `packages/boppad-js-api` — 9/9 pass.
- `npm run package-mac` (from `apps/desktop`) — produced a signed universal DMG.
- `npm run package-win` (from `apps/desktop`) — produced a signed NSIS installer; Authenticode-verified, chains to the real `KMI Music, Inc.` cert.
- **`npm run deploy:web`** (real, production-overwriting) — run twice for real (2026-08-05 initial ship, 2026-08-06 version-display fix); confirmed via SSH both times. Dry-run first each time, as a matter of habit, not because it's still unverified.
- **Chunked firmware update** — hardware-validated end-to-end on a physical BopPad on both macOS (2026-08-03) and Windows (2026-08-04/05).
- `gh release upload` via `publish-github-win`/`publish-github-mac` — both platforms' installer artifacts confirmed present on the live `v1.2.0` GitHub Release.

## Not Yet Wired / Unverified

- **`release-mac.js` writing `app-update.yml`** (2026-11-24) hasn't been through a full signed build yet; check `Contents/Resources/app-update.yml` in the built app and run Check for Updates from it.
- **Cloudflare cache purging is manual** — no Cloudflare API token exists in `.env`/`.env.example`, so a stale `bundle.js` (7-day `max-age`) after a deploy needs CDN dashboard access to purge immediately; otherwise it self-resolves within 7 days. `index.html` itself is never cached (`cf-cache-status: DYNAMIC`), so this only affects `bundle.js`/`style.css`/etc., not the page shell.
