<!-- buddy:visibility=public -->
# Handoff

## 2026-11-25: 1.3.0 to the Windows machine

The Mac side finished 1.3.0 (see current-task.md). The Windows side needs to build and test the same commit. Don't push, tag or publish anything; report results to the owner.

1. Pull the 1.3.0 commit once the owner has pushed it. Do a fresh `npm ci` with Node 24, since the Dropbox-synced `node_modules` has Mac binaries.
2. `npm run build:desktop`, then `npm run start:desktop`.
3. Test with a BopPad:
   - The blank-screen repro: add a 2nd note in quadrant A, then click a number box in quadrant B.
   - Unplug and replug the BopPad a few times, with and without the User Tables window open.
   - User Tables: save a curve with no BopPad connected, load Device tables 1 to 4, send a saved curve to a slot, replug and reopen to check it stuck, then export and import the curves file.
   - One full firmware update. The enter-bootloader command path changed (decisions.md), so this needs a hardware run before release.
   - The main window and the User Tables window (now taller) fit without scrollbars.
4. Also try the web editor in Chrome or Edge (`npm run start:web`), since the original crash reports came from those browsers.
5. `npm run package-win`, check the signature, install over 1.2.0, and run Check for Updates from the installed app.
