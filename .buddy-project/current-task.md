<!-- buddy:visibility=public -->
# Current Task

## In progress (2026-11-25): v1.3.0 test build

1.3.0 is code-complete on Mac and owner-tested with a BopPad. Plan: a signed, notarized Mac DMG goes to the people who reported the bugs, the Windows side builds and tests the same commit, then public release. Nothing is published yet.

**What's in 1.3.0:**
1. **Renderer crash ("editor goes blank").** Both triggers are gone: NexusUI is replaced by `curveSlider.js` (no AudioContext anywhere in the bundle), and the `BopPad` output now waits for the port to open before sending. Underlying cause and evidence in decisions.md and corrections.md.
2. **Unclickable controls on Mac** (GitHub #1). Drag region limited to a 44px `.titlebar-drag` strip. Owner click-tested 2026-11-24.
3. **Check for Updates on Mac** (GitHub #2). `release-mac.js` writes `app-update.yml` before signing. Still needs checking in a real signed build.
4. **Curve library** (`curveLibrary.js`). One curve menu with a User group (saved locally, editable offline) and a Device group (the BopPad's 4 user tables), destination buttons 1 to 4 to send a curve to a slot, JSON import/export, one-time migration of old `_boppadusertables_User_Table_N` entries. Single curves only (owner's call).

**Next:**
- **Mac DMG: blocked on Apple.** Notarization returns HTTP 403 ("A required agreement is missing or has expired"); the team account holder has to accept the updated agreement at developer.apple.com. Then `npm run package-mac-dist` from `apps/desktop` with `APPLE_KEYCHAIN_PROFILE` set, and check the result (spctl, `app-update.yml` present, Check for Updates).
- **Windows** builds and tests the same commit, see handoff.md.
- **Firmware update needs a hardware re-test** before release: the enter-bootloader command goes through the new send-when-open `BopPad` output. Chunk transfer uses the separate bootloader port and isn't affected.
- Then commit/tag/publish (owner-gated) and deploy the web editor.
- Later: upgrade Electron. 28 is EOL, and the Chromium bug behind the crash is still in it.

---

**v1.2.0 shipped and is live** (2026-08-05/06): hardware-validated chunked firmware update (macOS 2026-08-03, Windows 2026-08-04), signed Windows installer and signed macOS DMG both on the public `v1.2.0` GitHub Release (`Muse-Kinetics/boppad-editor`), and the web editor deployed to production at `files.keithmcmillen.com`. Git history is a single reconciled commit, `e5ab1d6` on `main`, tag `v1.2.0` — see decisions.md for why a second re-squash was needed (the Mac and Windows machines had each independently squashed and pushed unrelated histories). (As of 2026-11-24 the Mac checkout tracks `origin/main`, and the pending Mac rebuild is folded into the 1.3.0 release above.) Everything below this point is the chronological log of how it got here; read top-down for the story, or jump to "Remaining" for what's actually left.

## Done (2026-08-04, Windows session)

Full Windows-side validation pass: build → hardware-test firmware → build/test/sign installer, plus OSS-prep cleanup. All uncommitted (working-tree only, no push).

- **Fresh Windows `npm install`** — the Dropbox-synced `node_modules` had macOS-platform Electron binaries; wiped and reinstalled clean for win32.
- **Two real cross-platform build bugs found and fixed**: `apps/desktop/scripts/sync-renderer.js` used `execFileSync('npm', ...)`, which can't spawn Windows' `npm.cmd` (fixed: `execSync('npm run build', ...)`, which goes through a shell on both platforms); `apps/web/package.json`'s `build` script used POSIX-only inline `NODE_ENV=production`, which `cmd.exe` doesn't parse (fixed: added `cross-env` devDependency).
- **Real firmware-update bug found and fixed on real hardware**: post-flash verify only polled for the device's **input** port to reappear before immediately calling `MIDI.getOutput(deviceName).send(...)` — on Windows the output port re-enumerates a beat after input, so this raced into `undefined.send()` and crashed with the update already having succeeded. Fixed in `firmwareUpdater.js`: poll for both input and output before verifying. Firmware update now confirmed working end-to-end on a real BopPad over Windows/WebMIDI.
- **Windows Hardware-menu item added**: "Install Windows MIDI Services" (links to `https://microsoft.github.io/MIDI/get-latest/`, Windows-only) — the Electron-side equivalent of the Qt editors' Help-menu item, per `status_aug2026.md`'s cross-cutting to-do. `apps/desktop/modules/templateMenu.js`.
- **Window sizing fixed on Windows**: `apps/desktop/index.js` — Windows chrome ate more vertical space than macOS's hidden-titlebar chrome at the same requested height, clipping the bottom row and forcing a scrollbar. `windowOptions.height += 45` on win32 only (mac unaffected).
- **Signed Windows installer built and verified**: `release/BopPad Editor Setup 1.2.0.exe`, 2 valid signatures (sha1 + sha256), both chaining to the real `KMI Music, Inc.` cert. Root cause of initial signing failures: `signWindows.js` hardcoded an old `10.0.18362.0` signtool that can't disambiguate `/a` auto-cert-select against this machine's cert store (which also holds unrelated non-code-signing certs); fixed by pointing at `10.0.22000.0` instead — the same signtool version K-Mix's independently-proven `make-installer.ps1` uses. See decisions.md.
- **Installer tested for real**: installed cleanly over a pre-existing prior install, auto-launched, and a direct re-launch from the installed path (`%LOCALAPPDATA%\Programs\boppad_editor\`) works; `%APPDATA%\BopPad Editor\logs\main.log` shows clean startup, no errors.
- **Real pre-existing bug found and fixed**: `apps/web/src/app.js` hardcoded stale version display strings — `BOPPAD_EDITOR_VERSION = '1.1.1'` and `BOPPAD_FIRMWARE_VERSION = '3.0.2'` — out of sync with the actual shipping versions (1.2.0 / 3.0.4). Fixed; confirmed via the installed app's title bar.
- **`core.fileMode` set to `false`** (matches K-Board's repo config) — the squash commit has 5 files at mode `100755` that read as `100644` on Windows, showing as spurious diffs. `.gitattributes` was already correct (byte-identical to K-Board's proven version); only the local git config needed the fix.
- **OSS-prep gap closed**: added `CONTRIBUTING.md` (adapted from K-Board's — this was on the original migration plan's "reuse from K-Board" list but never actually got copied over). Refreshed `README.md`: removed a broken link to `../MIGRATION-PLAN.md` (that file lives outside the repo, in the private `00_Editors/BopPad/` folder — dead link in the public squash), replaced stale "Modernization in progress" framing with the actual current state (hardware-validated firmware, verified Windows/mac build baseline), added Contributing/Trademarks sections matching K-Board's structure.
- **`release-notes.md` fixed** — was last updated at v1.1.0; added a real v1.2.0 entry (chunked/verified firmware transfer, firmware 3.0.4, Windows MIDI Services menu item). This file is auto-picked-up by electron-builder into `latest.yml`'s `releaseNotes` field (shown in the in-app update notification), so it was stale in a user-visible way, not just cosmetic.

**Windows side is now fully validated**: build, hardware-tested firmware update, signed+verified installer, install-over-existing-install tested. **macOS side needs its own pass on the Mac** — the DMG built 2026-08-03 predates today's shared-code fixes (the firmware port-race fix and the version-string fix both touch `apps/web/src`, so they apply to mac too) and needs rebuilding/renotarizing there; that work is intentionally deferred to the Mac machine, not done here.

## Done (2026-08-03)

- Removed the temporary hardware-debug helpers (the `console-message`/`did-fail-load`/`render-process-gone` capture block in `apps/desktop/index.js`; the `previewFirmwareDialog` dev global in `firmwareUpdater.js`).
- **SPDX headers** (`MPL-2.0` / KMI Music, Inc.) added to 53 first-party JS/SCSS files; vendored (`styles/vendor/*`, `_normalize`) correctly skipped.
- **Squashed OSS repo**: `git init` in the monorepo → single commit `1880eab` (116 files, `.env`-free / `.buddy-project`-free / no `node_modules`/build artifacts; `renderer/` added to `.gitignore`). Branch `main`, remote `origin` → `git@github.com:Muse-Kinetics/boppad-editor.git`. **Not pushed.**
- **macOS release artifact**: rebuilt the signed universal DMG from the final code (`package-mac`, `BopPad Editor-1.1.1-universal.dmg` + blockmap + `latest-mac.yml` in `apps/desktop/release/`) — signed, NOT yet notarized.

## Done (2026-08-05, Windows session — Dropbox recovery)

The real `Muse-Kinetics/boppad-editor` GitHub repo now exists; the Mac side pushed its 2026-08-03 squash (`c3216be`) and published the **v1.2.0 GitHub Release** (signed universal mac DMG) while Dropbox was misbehaving on this machine. `origin` (pointing at the real repo) added locally and fetched — confirmed **no common commits** with local `main` (`58e9204`): these are two independent squash roots, not a normal ahead/behind pair. Reconciled at the content level instead of via git merge (see blockers.md for the two real corruption artifacts found and fixed: `apps/desktop/package.json` missing `js-yaml`, `release-mac.js`'s channel-metadata regenerator reverted to an older/less-robust version). Root `npm install` + `npm run build:desktop` rebuilt clean; desktop editor launched and confirmed clean startup in `main.log`. **Nothing pushed.**

## Done (2026-08-05, later same session) — Windows artifacts published to v1.2.0

Owner (Eric) was present and directed this live. Built + signed `BopPad Editor Setup 1.2.0.exe` (`npm run package-win`) — Authenticode signature verified valid, chains to the real `KMI Music, Inc.` cert, timestamped. Uploaded via `npm run publish-github-win` (`gh release upload`, no git push/history touch) to the **existing** `v1.2.0` GitHub Release that the Mac side had already created. The release now carries both platforms' assets: `BopPad Editor-1.2.0-universal.dmg(.blockmap)`, `latest-mac.yml`, `BopPad Editor Setup 1.2.0.exe(.blockmap)`, `latest.yml`. https://github.com/Muse-Kinetics/boppad-editor/releases/tag/v1.2.0

Also debugged a live hardware hang during this session's firmware-update test: chunked transfer completed and the editor hung at "Waiting for device restart…". Root-caused to a Chrome-on-Windows Web MIDI quirk (the browser tab wasn't running the `enable-midi-manager-dynamic-instantiation=disabled` flag that the Electron app applies automatically in `index.js`) rather than a firmware/hardware problem — confirmed via `SendSysEx.exe --midi-backend winmm -l`, which showed the device back at the OS level as a normal `BopPad` port, not bricked. Owner confirmed a subsequent update completed successfully with correct port names. No code change was made for this — noted here in case it recurs; see decisions.md if it's worth a permanent fix (e.g. surfacing the flag warning in the web build, or documenting it in CONTRIBUTING.md for anyone testing the browser editor on Windows).

**Note:** this publish did NOT touch the git-history-divergence issue (then still outstanding) — `publish-github.js` only uploads binaries to the GitHub Release via `gh`, independent of the two unrelated squash commits. That reconciliation was resolved shortly after; see below.

## Done (2026-08-05, later still) — git history reconciled, single commit is now canonical

Owner chose option 2: re-squash once more from the fully-reconciled working tree (Mac's + Windows' fixes both folded in) and force-push over the Mac-authored `c3216be`, rather than replaying deltas on top of it. Also removed "monorepo" from all public-facing text (README title/intro, `NOTICE` title, in-app `release-notes.md` v1.2.0 entry) per owner's instruction — left internal identifiers alone (root `package.json` `name: "boppad-editor-monorepo"`, and dev-comment mentions of "the monorepo root" in `release-mac.js`/`publish-github.js`), since those aren't user-facing copy.

New canonical commit: **`e5ab1d6`**, a fresh root commit (no parent) on `main`, message "BopPad Editor v1.2.0 — hardware-validated release (MPL-2.0)". `origin/main` and tag `v1.2.0` both force-pushed to point at it (owner ran the git commands directly — Claude Code's auto-mode classifier blocks commit/branch-ref/push operations even with explicit owner instruction in this session, so every git-history-mutating step had to be handed to the owner to run via `!`). Confirmed after the fact: the `v1.2.0` GitHub Release kept all 6 assets (mac dmg+blockmap+`latest-mac.yml`, win exe+blockmap+`latest.yml`) — moving a tag doesn't detach already-uploaded release assets.

**There is now exactly one `main` and one history.** The old Mac squash `c3216be` and the old local squash `58e9204` are both superseded/orphaned — no further action needed on them.

## Done (2026-08-05, later still) — web editor deployed to production

Owner said "do it soup to nuts" — built fresh from the reconciled `e5ab1d6` (`npm run build:web`, clean), dry-run deploy (green, 8 expected build entries, upload/overwrite only), then the real `npm run deploy:web` to the configured deploy target. Confirmed over SSH: `bundle.js`/`index.html` freshly written with correct `www-data` group ownership. **This was the first-ever real (production-overwriting) web deploy** — previously only dry-run-verified since 2026-08-01. The live web editor now matches the same commit as both desktop releases.

## Done (2026-08-06) — fixed the stale online version-check file, made it part of deploy

Testing the live deploy with a real BopPad surfaced two independent bugs, both real:

1. **Preferences pane showed editor `1.1.1` even after a hard refresh.** Root cause: `files.keithmcmillen.com` fronts the editor through Cloudflare, and `bundle.js`/etc. are served with `cache-control: public, max-age=604800` (7 days). Cloudflare's edge had a pre-deploy copy cached (`cf-cache-status: HIT`, `age` older than the deploy) and kept serving it regardless of browser refresh — the file on the origin server was already correct. **Purged manually** (no Cloudflare API token exists in `.env`/`.env.example` for the editor tooling to do this programmatically — needs dashboard access). Turned out this purge alone didn't fully explain what the owner was still seeing — see the next "Done" entry below for the real, separate root cause. Longer-term real fix would be content-hashed build filenames so this class of bug can't recur at all — not done here, flagged for later.
2. **False "new firmware available" banner despite the device correctly running 3.0.4.** Root cause: `checkFirmware.js`'s *online* latest-version check hits a separate, hand-maintained file — `products/boppad/firmware/currentVersion.json` (sibling to `products/boppad/editor/`, NOT the editor's own bundled `firmware/currentVersion.json`) — which still had `editor: 1.1.1, firmware: 3.0.3` baked in from before this migration. **Fixed and made structural**: `apps/web/scripts/deploy-build.js` now generates this file itself on every deploy from the same sources of truth as the rest of the release (`apps/web/package.json`'s `version`, root `firmware/currentVersion.json`'s `firmware.version`) and uploads it to that sibling path, instead of relying on someone hand-editing it. Verified live: the file now reads `1.2.0`/`3.0.4`, served `cf-cache-status: DYNAMIC` (not cached — no `cache-control` header from origin, and the client fetch already uses `cache: "no-store"` plus a cache-busting query param), so this can't silently drift stale again.

## Done (2026-08-06, later) — root-caused and fixed the "1.1.1" display bug for real

The Cloudflare cache was purged, but the Preferences pane still showed `1.1.1` in a fresh browser (no device connected). Real root cause, unrelated to caching: `apps/web/index.html` hardcodes the version text directly in markup (`editor: 1.1.1`, `firmware: 0.0.0`), and that text only ever gets overwritten by `updateVersionDisplay()` once a physical device connects and replies (`checkFirmware.js` → `firmwareeditorchecked` event) — with no device, the raw stale HTML is exactly what renders, regardless of how correct `bundle.js` is.

Fixed two ways: (1) corrected the static placeholder text in `index.html` to `1.2.0`/`3.0.4`; (2) `apps/web/src/app.js` now calls `updateVersionDisplay()` unconditionally right after the `globalThis.BOPPAD_EDITOR_VERSION`/`BOPPAD_FIRMWARE_VERSION` assignments, instead of only from device-connect/online-check event handlers — so it's correct immediately on load and self-heals even if a future version bump misses the HTML placeholder again. Rebuilt, dry-run verified, deployed. **No Cloudflare purge was needed for this one** — confirmed `index.html` is served `cf-cache-status: DYNAMIC` (no `cache-control` on it at all, unlike `bundle.js`), so origin changes to it are always immediately live.

## Remaining (all owner-approval-gated)

1. (2026-11-24: folded into the 1.3.0 release, see the top of this file.) **macOS rebuild + release — explicitly deferred to the Mac machine** (2026-08-04 decision). The `BopPad Editor-1.2.0-universal.dmg` on GitHub is still built from before the git-history reconciliation (uploaded 2026-08-03, from the old `c3216be` tree) — not a functional gap (the diffs were packaging/release-tooling and doc files, not shipped-app code), but the Mac machine should adopt the new canonical history (`git fetch && git reset --hard origin/main`, since its local `main` is the now-superseded `c3216be`) and rebuild next time it touches this repo: `npm run package-mac-dist` (or `package-mac` + `notarize-dmg`) → `npm run publish-github-mac`. `.env` needed with `APPLE_KEYCHAIN_PROFILE`.
2. Do not push/publish without explicit owner approval.

**Windows + web are both fully done and live**: signed installer + hardware-validated firmware update, published to `v1.2.0` on GitHub, and the web editor deployed to production — all from the same reconciled `e5ab1d6` commit, with the online version-check self-generated by the deploy script and the version-display bug fixed at its root. Only macOS's rebuild (on the Mac machine) remains.

## Status Snapshot (2026-08-01)

Phases 1–5 done (details in `../MIGRATION-PLAN.md`):

- **Phase 1 — consolidation:** npm-workspaces scaffold (Node 24, MPL LICENSE/NOTICE, `.env` gitignored + `.env.example`); `Browser/app` → `apps/web`, `Desktop` → `apps/desktop`; firmware consolidated to root `firmware/`; installs clean.
- **Phase 2 — toolchain:** dropped Bower + vendored `lib/`; bootstrap-sass/lodash → npm; replaced deprecated webpack plugins (extract-text dropped, uglifyjs → terser, json-loader → native, url-loader → asset modules, dev-server v3 → v4); removed dead `electronAnalytics.js`. Web builds clean.
- **Phase 3 — Electron 28 + build wiring:** Electron 13 → 28; desktop builds+consumes the web output via `apps/desktop/scripts/sync-renderer.js` → `renderer/` (the hand-copied `bundle.js` + drift is GONE); dead deps removed (electron-google-analytics, electron-debug, uuid, devtron); fixed the broken callback-style `showOpenDialog` (Import Presets) → promises; `body.electron` top padding 23 → 44px. Desktop UI verified visually identical to the legacy editor. **contextIsolation hardening attempted and reverted** (see decisions.md) — deferred.
- **Phase 4 — signing/release:** reused K-Board's `release-mac.js` / `publish-github.js` / `signWindows.js`; `build.publish` → github (`Muse-Kinetics/boppad-editor`); unified entitlements; removed legacy `notarize.js` + `BopPad Make DMG.sh`. **VERIFIED:** `package-mac` produced a signed 167 MB universal DMG with regenerated `latest-mac.yml`.
- **Phase 5 — chunked local-first firmware (now hardware-validated, see 2026-08-03/04 entries above):** extracted headless `packages/boppad-js-api` (`sysexChunking.js`, `chunkedFirmwareSender.js`, `deviceConstants.js`); **9/9 unit tests pass** against the real `_cs128` image. Rewrote `apps/web/src/modules/firmwareUpdater.js` local-first (XHR, `file://`-safe) + chunked send with between-chunk identity handshake + paced-only fallback + progress % + real `.catch`. Web + desktop build clean; the package + firmware bundle into both. Protocol mirrors the hardware-validated `mk_firmware_tester`.

- **Web editor verified locally (2026-08-01), later deployed for real (2026-08-05/06):** the initial monorepo web build was run on the localhost dev server (`start:web`, HTTPS :9000) and **owner-confirmed it looks good**; production was deliberately not overwritten at the time, pending firmware hardware validation. That gate has since cleared — see the 2026-08-05/06 entries above for the actual production deploy and the version-display fixes that followed it.

## Next Checks / Known Minor Issues

1. **`checkFirmware.js` still online-fetches the latest-version banner** from `files.keithmcmillen.com/products/boppad/...` (non-blocking, `.catch`-wrapped; not a flashing dependency). The file it fetches is now auto-generated by the deploy script (2026-08-06 fix, see decisions.md), so it no longer drifts stale — but routing this whole check through the GitHub Releases flow instead of a separate hosted file is still owner's longer-term stated plan. Note the offline fallback filename (`currentVersionOffline.json`) is not bundled — only `currentVersion.json` is.
2. `apps/desktop/preload.js` is present but unused (leftover from the reverted contextIsolation attempt).
3. No content-hashed build filenames (`bundle.js` is always `bundle.js`) — this is why the Cloudflare cache-staleness issue (2026-08-06) was possible at all. Worth revisiting if it recurs; not done as part of this release.
