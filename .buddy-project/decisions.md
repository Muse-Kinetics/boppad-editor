<!-- buddy:visibility=public -->
# Decisions

Owner decisions were recorded 2026-08-01 at the start of the migration; see also `../MIGRATION-PLAN.md` (one level up, in `00_Editors/BopPad/`).

## License: MPL-2.0 (the MIT license was a mistake)

- Decision: relicense the whole workspace to **MPL-2.0**. Copyright holder **KMI Music, Inc.**; author credit **Andrej Hronco**.
- Rationale: the legacy repos carried MIT + `©2022 KMI Music, LLC`, but BopPad was never publicly released, so MIT was never an intentional public grant. MPL-2.0 matches the K-Board public track.
- Consequence: top-level `LICENSE` + `NOTICE`, per-file SPDX headers, and updated metadata. The relicensing takes full effect at the squash into the new public-track repo.

## Keep the jQuery UI — no React port

- Decision: do **not** port the editor to React. Keep the existing jQuery 3.6 + Bootstrap-sass UI.
- Rationale: a rewrite is high-risk and unnecessary; the goal is "consolidate + modernize + chunk," not "rewrite." Revisit only if a compelling need appears.
- Consequence: no `packages/editor-core` (unlike K-Board). The shared package (`packages/boppad-js-api`) is device/firmware logic only, not UI.

## Firmware is LOCAL-FIRST

- Decision: the editor flashes from the **bundled** `firmware/` copy; no web connection is required to function. Update *checks/reminders* flow through the GitHub Releases check once implemented — never a hard runtime web dependency.
- Rationale: same reliability contract as K-Board; users must be able to update firmware offline.
- Consequence: `firmwareUpdater.js` loads the bundled manifest + `.syx` via **XHR** (not `fetch`, which cannot read the desktop app's `file://` URLs), accepting HTTP status `200` *or* `0` (file://). Webpack copies top-level `firmware/` → `build/firmware`, and `sync-renderer.js` carries it into `renderer/firmware`.

## Firmware transfer: chunked with a between-chunk identity handshake

- Decision: replace the legacy single monolithic `output.send(wholeImage)` with a **chunked** send — split the `.syx` at `F0`/`F7` into its individual SysEx packets and send them one at a time, with an identity-request handshake between chunks (paced-only fallback if no bootloader input port is present).
- Rationale: the monolithic send relies entirely on USB flow control and drops packets / corrupts images on some systems (the same problem chunking fixed for K-Board). The `_cs128` payload is pre-chunked for exactly this. The between-chunk identity handshake is the "optional reliability strategy" documented in the firmware team's `mk_firmware_tester/sendsysex/docs/kmi_fw_update_process.md`, and its `chunkedSysExTransfer.h` (`sendChunkedFileToPort`) is the hardware-validated C++ reference.
- Consequence: the logic lives in `packages/boppad-js-api` (`splitSysexMessages` ported verbatim from K-Board + `sendChunkedFirmware`) and is unit-tested against the real image (566 packets, byte-preserving split, handshake ordering, abort-on-silence, paced fallback, AbortSignal cancel — 9/9 pass under `node --test`). **The end-to-end flash still must be verified on a physical BopPad** (bootloader input-port enumeration, identity replies between chunks, reboot+verify). See blockers.md.

## Canonical firmware source + shipping version

- Decision: the top-level `firmware/` directory is the single source of truth. Ship firmware **v3.0.4** — `firmware/BopPad Firmware v3.0.4_cs128.syx` (566 SysEx packets, header `F0 00 01 5F 7A 75 …`, KMI mfg id `00 01 5F 7A`, product `0x75`=117, chunk size 128) plus `firmware/BopPad_loadBootloader.syx` (11-byte enter-bootloader command) and `firmware/currentVersion.json`.
- Rationale: the legacy repos had diverged (Browser 3.0.2 / Desktop 3.0.1); 3.0.4 is the current chunked payload validated by the firmware tester. (Earlier notes said ~671 packets — the real count is 566.)
- Consequence: the manifest's `firmware.requestID` is the Universal Device Inquiry `F0 7E 7F 06 01 F7`, reused as the between-chunk identity probe; `bootloader.modeByte` = 9 distinguishes bootloader vs application in the identity reply.

## Publishing: GitHub Releases (reuse K-Board tooling)

- Decision: desktop artifacts publish to **GitHub Releases** (`Muse-Kinetics/boppad-editor`) via the electron-builder `github` publish provider and `publish-github.js`. Signing/notarization reuse K-Board's `release-mac.js` / `signWindows.js` / `@electron/notarize` + notarytool.
- Rationale: don't reinvent the release path; K-Board's is proven (including the mac channel-metadata-after-signing fix).
- Consequence: unified entitlements at `apps/desktop/build-assets/entitlements.mac.plist`; the legacy `notarize.js` + `BopPad Make DMG.sh` + `afterSign` hook are removed. `.env.example` documents `APPLE_KEYCHAIN_PROFILE`. (Web-editor hosting/deploy is not yet wired in this monorepo — see current-task.md.)

## electron-builder must stay on ^23.0.3

- Decision: pin `electron-builder` to `^23.0.3` (desktop devDependency). Do not bump to 24.x.
- Rationale: electron-builder 24.13.3's newer `7zip-bin` throws `ENOENT: chmod '.../7zip-bin/mac/arm64/7za'` during mac packaging. K-Board uses 23.6.0 successfully.
- Consequence: verified — `package-mac` produced a signed 167 MB universal DMG (`BopPad Editor-1.1.1-universal.dmg`) with regenerated `latest-mac.yml`. BopPad has no native node modules, so the removed `install-app-deps` postinstall is a no-op (its presence caused a "Cannot compute electron version" failure and was removed).

## contextIsolation hardening deferred (reverted)

- Decision: keep the desktop shell on `nodeIntegration: true` / `contextIsolation: false` with `require('electron')` in the renderer for now. Redo the preload/contextBridge hardening later with a DevTools session.
- Rationale: with `contextIsolation: true` / `nodeIntegration: false` the jQuery renderer painted **blank with no JS error surfaced**; reverting unblocked the migration.
- Consequence: an unused `apps/desktop/preload.js` remains in the tree as a starting point. NOTE: re-enabling `nodeIntegration` is auto-blocked by the safety classifier and required owner approval + a shell edit to `index.html`.

## Web editor hosting + deploy (scp/ssh, no PUBLIC_URL rewrite)

- Decision: the web editor is hosted at `https://files.keithmcmillen.com/products/boppad/editor/`, deployed over SSH to the host that serves it. Deploy with `apps/web/scripts/deploy-build.js` — scp `build/`'s contents over the top, **upload/overwrite only, never `--delete`**. Target comes entirely from env (`BP_WEB_SSH_SERVER`/`BP_WEB_SSH_LOCATION`, falling back to shared `KB_WEB_*`/`KB_*`), so no internal host path lives in the public-track source.
- Rationale: mirrors K-Board's proven web deploy. No-delete is mandatory because the live editor dir holds siblings the build never produces — `factoryPresets*.json`, `boppad-editor.png`, and the `mac/`/`win/`/`web/` + `BopPadEditorWIN.zip` installer assets — which must survive a deploy. The dev workflow (`start:web`, HTTPS :9000 / localhost secure context) and a plain `build` already worked; only the deploy half was missing.
- Consequence: unlike CRA-based K-Board, BopPad needs **no `PUBLIC_URL`/`build-for-deploy.js` step** — its build uses relative asset paths (`src="bundle.js"`, `firmware/…`), so one build is portable to the subdirectory. Key-based SSH to the deploy host is verified; the tooling is dry-run-verified but a first real (production-overwriting) upload still needs explicit owner approval. Note `app.js` still fetches `factoryPresets.json` and `checkFirmware.js` fetches the latest-version banner from the hosted path at runtime — non-blocking, but candidates to move to the bundled/GitHub-Releases flow later.

## Windows signtool must be a recent SDK build (10.0.22000.0, not 10.0.18362.0)

- Decision: `apps/desktop/signWindows.js`'s `SIGNTOOL_PATH` points at the Windows 11 SDK's signtool (`C:\Program Files (x86)\Windows Kits\10\bin\10.0.22000.0\x64\signtool.exe`), not the older `10.0.18362.0` build both this file and K-Board's copy originally hardcoded.
- Rationale: on the Windows release machine's actual cert store (which also holds several unrelated non-code-signing certs — VPN/device-trust certs, etc. — alongside the real `KMI Music, Inc.` Certum Code Signing cert), the old signtool's `/a` auto-select can't disambiguate and fails with "Multiple certificates were found," even though only one candidate actually survives EKU + expiry + private-key filtering. The newer signtool resolves it correctly with the exact same `/a` flag — no cert-pinning workaround needed. Confirmed this is the real cause (not a code-signing-approach problem) by testing K-Mix's independently-working `make-installer.ps1`, which uses `10.0.22000.0` + plain `/a` and signs successfully on this same machine.
- Consequence: don't try to fix cert ambiguity by pinning a thumbprint (`/sha1`) or filtering by subject (`/n`) — that was tried and works, but it's an unnecessary deviation from the proven K-Board/K-Mix pattern and adds a thumbprint that goes stale when the cert renews (2028-01-15). Just use a current-enough signtool. If this recurs on a different machine, check `signtool sign /a ... /debug` output for the EKU/expiry/private-key filtering steps — if it still can't disambiguate with a recent signtool, *then* consider pinning.
- Also fixed as part of the same investigation: **do all signtool testing through PowerShell, not Git Bash.** Git Bash's MSYS layer auto-converts single-slash flags (`/pa`, `/a`, etc.) into Windows paths (e.g. `/pa` → `C:/Program Files/Git/pa`), silently corrupting signtool invocations and producing misleading errors. This cost real debugging time before being caught. `child_process.exec`/`execFileSync` from Node are unaffected (they don't go through Git Bash's shell), so this only matters for manual/interactive signtool testing.

## `core.fileMode` must be `false` on this repo (matches K-Board)

- Decision: `git config core.fileMode false`, set locally on the Windows release machine's checkout (not a repo file — this doesn't travel with the repo, each fresh clone/machine needs it set).
- Rationale: the squash commit has several files at mode `100755` (executable) that aren't actually meant to be executable (plain `.eslintrc`, `.gitignore`, `.scss`, `.ttf` files) — an artifact of how they were staged during the original Mac-side `git init`/squash. Windows/NTFS checkouts report these as `100644`, and with `core.fileMode` at its default `true`, git treats that as a real diff on every single status check, masking genuine changes in a wall of mode-only noise. `.gitattributes` was already correct (byte-identical to K-Board's) — this was purely a local git-config gap, not a repo-content problem.
- Consequence: any other machine that clones this repo fresh on Windows should set `core.fileMode false` too if this noise reappears. Same fix SoftStep/QuNeo used for a similar Dropbox/Windows executable-bit problem — see the SOP.

## `.env` loading must be `__dirname`-relative, not cwd-relative

- Decision: `release-mac.js` and `publish-github.js` now load `.env` via an explicit path (`path.resolve(__dirname, "..", "..", ".env")`) instead of `require("dotenv").config()`'s cwd-relative default.
- Rationale: `.env` lives at the monorepo root, but both scripts run with cwd set to `apps/desktop` (however they're invoked — `npm run package-mac` from within `apps/desktop`, or via the root workspace mechanism, both land cwd there when the script body executes). Dotenv's default therefore looked for `apps/desktop/.env`, which doesn't exist — `APPLE_KEYCHAIN_PROFILE` would have silently been `undefined` the first time real notarization was attempted. Found while building VS Code tasks for these scripts, before it ever bit a real release.
- Consequence: this fix is invocation-path-independent — the mac notarization tasks in `.vscode/tasks.json` don't need any special env-loading wrapper (unlike the web-deploy scripts, which never self-loaded dotenv at all — see the VS Code Tooling section in commands.md).

## Git history: re-squash and force-push, don't replay deltas on top of the Mac commit

- Decision (2026-08-05): when the Mac-authored squash (`c3216be`, already pushed + tagged `v1.2.0` + released) and this machine's independent squash (`58e9204`, never pushed) turned out to share zero git history (`git fetch` reported "no common commits" — both are independent orphan roots, not a normal ahead/behind pair), the owner chose to re-squash once more from the fully content-reconciled working tree and **force-push over** `c3216be`, rather than reset to `origin/main` and replay the Windows-only deltas on top of it.
- Rationale: the release was hours old with nothing else forked from it, so rewriting was low-risk; a fresh single commit keeps the "one clean commit" property the whole squash effort was for, rather than accumulating a second commit on day one of public history.
- Consequence: new canonical commit **`e5ab1d6`** (root, no parent), message "BopPad Editor v1.2.0 — hardware-validated release (MPL-2.0)". `origin/main` and tag `v1.2.0` both force-pushed to point at it; verified the GitHub Release kept all 6 already-uploaded assets (moving a tag doesn't detach release assets). The old `c3216be` and `58e9204` are both superseded/orphaned. The Mac machine's local `main` is now stale relative to origin and needs `git fetch && git reset --hard origin/main` next time it's used. Every git-history-mutating command in this flow (commit, branch move, force-push, tag move) was blocked by Claude Code's auto-mode classifier even with explicit owner approval — the owner ran all of them directly via `!<command>`; see guidelines.md.

## No "monorepo" in public-facing text

- Decision (2026-08-05): drop the word "monorepo" from anything a user/contributor actually reads — `README.md` (title + intro), `NOTICE` (title), and the in-app `apps/desktop/build-assets/release-notes.md` v1.2.0 entry (shown in the desktop app's update-notification dialog).
- Rationale: owner's call — "monorepo" is an internal architecture term, not something end users or downstream contributors need described to them.
- Consequence: internal identifiers were deliberately left alone (not in scope): root `package.json`'s `name: "boppad-editor-monorepo"`, and dev-comments like "`.env` lives at the monorepo root" in `release-mac.js`/`publish-github.js`. If a future pass wants those gone too, that's a separate, larger rename (touches the npm workspace name), not a copy-only fix.

## Web deploy generates the online version-check manifest; it's not hand-maintained

- Decision (2026-08-06): `apps/web/scripts/deploy-build.js` now builds `products/boppad/firmware/currentVersion.json` (the file `checkFirmware.js` fetches to decide "is a newer version published") itself on every deploy, from `apps/web/package.json`'s `version` and root `firmware/currentVersion.json`'s `firmware.version`, and uploads it to that path (a sibling of the editor's own deploy target, not part of the build output).
- Rationale: this file had silently drifted since before the migration (still read `editor 1.1.1 / firmware 3.0.3` after the v1.2.0/3.0.4 release), causing a false "new firmware available" banner against a fully up-to-date device on the very first real deploy. Hand-maintaining a second copy of version numbers is exactly the kind of thing that drifts; generating it from the same sources of truth as the rest of the release can't.
- Consequence: every future `npm run deploy:web` keeps this file honest automatically. `chgrp` on the sibling `firmware/` directory can fail with "Operation not permitted" depending on the SSH user's group membership there — non-fatal by design (same upload-succeeds-regardless philosophy as the rest of the script), files still land world-readable via `scp`.

## Version display: paint immediately from build-time defaults, don't wait for a device

- Decision (2026-08-06): `apps/web/src/app.js` now calls `updateVersionDisplay()` unconditionally right after setting `globalThis.BOPPAD_EDITOR_VERSION`/`BOPPAD_FIRMWARE_VERSION`, instead of only from the device-connect (`firmwareeditorchecked`) and firmware-update-complete event handlers. The static placeholder text in `apps/web/index.html` (`editor: 1.1.1`, `firmware: 0.0.0`) was also corrected to match.
- Rationale: real bug found testing the v1.2.0 deploy — a fresh browser with **no BopPad connected** showed the raw hardcoded HTML placeholder forever, since nothing ever ran to overwrite it. This wasn't a caching issue (confirmed the live `bundle.js` was already correct); it was that the only code path which paints the Preferences-pane version text required a real device round-trip first.
- Consequence: the Preferences pane and browser tab title are now correct immediately on page load, independent of device connection; a later real device reply still corrects the firmware line if that specific unit is running something other than the bundled version. Both fixes together are defense-in-depth — even if a future release forgets to update the HTML placeholder again, the unconditional JS call will still self-heal it.

## NexusUI's audio clock is stopped at import (2026-11-24)

- Decision: `userCurves.js` calls `Nexus.clock.stop()` and `Nexus.context.close()` right after importing NexusUI.
- Rationale: NexusUI's constructor starts an AudioContext and a ScriptProcessorNode clock (256-frame buffer, roughly every 6ms) that runs for the life of the page, and that callback segfaults the Chromium renderer (`blink::ScriptProcessorNode::DispatchEvent`) after ordinary clicking. That's the blank-screen bug, on web and desktop. We only use the Multislider and make no sound; the crash was found by symbolizing it against Electron 28.3.3's breakpad symbols.
- Consequence: no audio graph runs. If we ever use NexusUI's Sequencer or Interval this needs revisiting, and swapping NexusUI for a small multislider of our own would drop the dependency.

## Window drag region is only the 44px title bar strip (2026-11-24)

- Decision: no `-webkit-app-region: drag` on `body.electron` or `.container`. A fixed `.titlebar-drag` element (44px, only under `.electron`) is the drag handle.
- Rationale: since Electron 28 a drag region on macOS swallows clicks, so anything that isn't a button, input or SVG stopped responding (GitHub #1). Windows gets a framed window where the CSS does nothing, which is probably why Windows testing of 1.2.0 didn't catch it.
- Consequence: new clickable elements don't need `no-drag`, but you can't drag the window from empty space lower down anymore. The old `no-drag` rules are harmless and left in place.

## release-mac.js writes app-update.yml itself (2026-11-24)

- Decision: after the `--dir` universal build, `release-mac.js` writes `Contents/Resources/app-update.yml` (`build.publish[0]` plus `updaterCacheDirName`) before signing. `--skip-build` fails if the file is missing.
- Rationale: electron-builder 23 only writes it on mac when the targets include dmg or zip. The `--dir` plus `--prepackaged` flow has neither, so 1.2.0 for Mac shipped without it (GitHub #2).
- Consequence: Mac updates should work from the next release, though this hasn't been through a full signed build yet. 1.2.0 Mac users have to update by hand once.

## Offline curve library, single curves only (2026-11-24, not implemented)

- Plan: a local library of named 128-point curves you can edit with no BopPad connected. The BopPad's 4 user table slots stay on the device: send a library curve to slot N, or save a slot into the library. Plus JSON export/import (the tables branch of `importLocalStorage` is still a stub) and migration of old `_boppadusertables_User_Table_N` entries, with device actions disabled when nothing's connected.
- Owner's call: single curves only, no 4-slot sets. Ships in the same pre-release test build as the 1.2.1 fixes.

## Buddy source of truth

- Decision: `.buddy-project/` is the canonical operational memory. `CLAUDE.md` and `.github/copilot-instructions.md` are adapters only, one per assistant convention.
- Rationale: same model as K-Board — agent-specific instruction files exist because each tool auto-loads its own filename, not because they hold independent content.
- Consequence: when project truth changes, update `.buddy-project/` and `README.md` first; refresh adapters only if their pointers are wrong — never duplicate durable content into them.
