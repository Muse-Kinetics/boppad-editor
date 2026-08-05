// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

const fs = require('fs');
const path = require('path');
const util = require('util');

const exec = util.promisify(require('child_process').exec);

// the path to signtool.exe; might be different on another machine.
// Must be a reasonably recent SDK build — the older 10.0.18362.0 signtool
// fails to auto-select (/a) the KMI code-signing cert on a store that also
// holds unrelated certs (VPN/device-trust, etc.), erroring "Multiple
// certificates were found" even though only one is actually EKU+expiry+
// private-key eligible. 10.0.22000.0 (Windows 11 SDK) resolves it correctly
// via /a — same signtool version K-Mix's proven-working make-installer.ps1
// uses (see K-Mix/.vscode/make-installer.ps1).
const SIGNTOOL_PATH = path.join('C:','Program Files (x86)','Windows Kits', '10','bin','10.0.22000.0','x64','signtool.exe');

const SKIP_SIGN_MARKER_PATH = path.join(__dirname, 'release', '.skip-windows-signing');

let counter = 1;

// electron-builder calls this once per (file, hash) pair it needs signed - the
// unpacked app exe, any helper binaries, and the final NSIS installer - each with
// sha1 then sha256. configuration.path/hash/isNest identify which call this is;
// hardcoding a single path here previously caused every call to re-sign only the
// unpacked app exe and skip the actual installer.
exports.default = async function(configuration){
  if (process.env.KB_SKIP_WINDOWS_SIGN === '1' || fs.existsSync(SKIP_SIGN_MARKER_PATH)) {
    console.log(`* code-signing skipped (hash: ${configuration.hash}, file: ${configuration.path})`);
    return;
  }

  const appendFlag = configuration.isNest ? ' /as' : '';
  // signed with sha1 (Windows 7) then sha256 (Windows 10), sha256 pass appended (/as) rather than replacing
  const signCommand = `"${SIGNTOOL_PATH}" sign /debug /a /fd ${configuration.hash} /tr http://timestamp.globalsign.com/tsa/advanced /td SHA256${appendFlag} "${configuration.path}"`;

  console.log(`* code-signing - step ${counter++}/8 (hash: ${configuration.hash}, file: ${configuration.path})`);
  await exec(signCommand, {stdio: 'inherit'});
}
