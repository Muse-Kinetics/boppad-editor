#!/usr/bin/env node
// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

//
// deploy-build.js
//
// Uploads the built web editor (apps/web/build/) to the files host over
// scp/ssh. Adapted from the K-Board monorepo's proven web deploy.
//
// BopPad's build uses RELATIVE asset paths (src="bundle.js", firmware/…), so
// one build is portable to any subdirectory — there is no PUBLIC_URL rewrite
// step to run first (unlike the CRA-based K-Board editor). `npm run build`
// then this script is the whole flow.
//
// This is upload/overwrite only — it does NOT mirror-with-delete. That is
// deliberate: the live editor directory holds siblings the build does not
// produce (factoryPresets*.json, the mac/ + win/ installer dirs, etc.), and
// they must survive a deploy.
//
// The deploy target is read entirely from the environment so no internal host
// path lives in the (public-track) source tree. Set BP_WEB_SSH_SERVER /
// BP_WEB_SSH_LOCATION (see .env.example); the shared KB_WEB_* / KB_* vars are
// honored as fallbacks.
//

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const buildDir = path.resolve(__dirname, '..', 'build');
const webPackageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webPackageRoot, '..', '..');
const remoteGroup =
  process.env.BP_WEB_REMOTE_GROUP
  || process.env.KB_WEB_REMOTE_GROUP
  || process.env.KB_DEPLOY_REMOTE_GROUP
  || 'www-data';

function parseArgs(argv) {
  const unrecognizedArgs = [];
  let target = null;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--target') {
      target = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === '--dry-run' || arg === '-n') {
      dryRun = true;
      continue;
    }

    if (arg === '--help') {
      console.log('Usage: node deploy-build.js [--target <name>] [--dry-run]');
      process.exit(0);
    }

    unrecognizedArgs.push(arg);
  }

  return { unrecognizedArgs, target, dryRun };
}

// Resolve the deploy host/location with a BP_WEB_* → KB_WEB_* → KB_* fallback
// chain. A named --target adds a BP_WEB_<TARGET>_* tier on top (e.g. a `dev`
// staging host via BP_WEB_DEV_SSH_SERVER / BP_WEB_DEV_SSH_LOCATION).
function resolveDeployEnv(target) {
  if (!target) {
    return {
      sshServer:
        process.env.BP_WEB_SSH_SERVER
        || process.env.KB_WEB_SSH_SERVER
        || process.env.KB_SSH_SERVER,
      sshLocation:
        process.env.BP_WEB_SSH_LOCATION
        || process.env.KB_WEB_SSH_LOCATION
        || process.env.KB_SSH_LOCATION,
      targetLabel: 'default'
    };
  }

  const targetKey = String(target).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');

  return {
    sshServer:
      process.env[`BP_WEB_${targetKey}_SSH_SERVER`]
      || process.env.BP_WEB_SSH_SERVER
      || process.env.KB_WEB_SSH_SERVER
      || process.env.KB_SSH_SERVER,
    sshLocation:
      process.env[`BP_WEB_${targetKey}_SSH_LOCATION`]
      || process.env.BP_WEB_SSH_LOCATION
      || process.env.KB_WEB_SSH_LOCATION
      || process.env.KB_SSH_LOCATION,
    targetLabel: target
  };
}

function quoteForShell(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function runSsh(sshServer, remoteCommand) {
  const result = spawnSync('ssh', [sshServer, remoteCommand], { stdio: 'inherit' });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
}

// Copy each top-level entry of buildDir by bare relative name (cwd set to
// buildDir) rather than "buildDir/." — scp has no "copy contents, not the
// directory itself" idiom, and bare names with a cwd sidestep that cleanly.
// Upload/overwrite only; siblings already on the server are untouched.
function scpUploadDirectoryContents(sshServer, localDir, remotePath) {
  const entries = fs.readdirSync(localDir);

  if (!entries.length) {
    return;
  }

  const result = spawnSync('scp', ['-r', ...entries, `${sshServer}:${remotePath}/`], { cwd: localDir, stdio: 'inherit' });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error('scp is required for web deployment but was not found in PATH.');
    } else {
      console.error(result.error.message);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status);
  }
}

function scpUploadFile(sshServer, localDir, fileName, remotePath) {
  const result = spawnSync('scp', ['-p', fileName, `${sshServer}:${remotePath}/`], { cwd: localDir, stdio: 'inherit' });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error('scp is required for web deployment but was not found in PATH.');
    } else {
      console.error(result.error.message);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status);
  }
}

// Best-effort ownership/permission normalization AFTER a successful upload. scp
// lands files world-readable (0644), so the server serves them regardless — a
// failure here (e.g. chgrp when the SSH user isn't in the web group) must not
// fail the deploy. Steps are independent (no `set -e`, no `&&` chain).
function syncRemoteGroupAndPermissions(sshServer, remotePath) {
  const remoteCommand = [
    `chgrp -R ${quoteForShell(remoteGroup)} ${quoteForShell(remotePath)} || echo "warning: could not chgrp ${remoteGroup} on ${remotePath} (upload is unaffected; files are world-readable 0644)" >&2`,
    `find ${quoteForShell(remotePath)} -type d -exec chmod 2755 {} + || true`,
    `find ${quoteForShell(remotePath)} -type f -exec chmod 0644 {} + || true`
  ].join('; ');

  const result = spawnSync('ssh', [sshServer, remoteCommand], { stdio: 'inherit' });

  if (result.error) {
    console.warn(`Skipping remote permission sync (upload already succeeded): ${result.error.message}`);
    return;
  }

  if (result.status !== 0) {
    console.warn(`Remote permission sync reported a non-zero status (${result.status}); the upload already succeeded, continuing.`);
  }
}

// checkFirmware.js's online "is a newer version published" check fetches a
// SEPARATE file, products/boppad/firmware/currentVersion.json — a sibling of
// the editor/ directory this script deploys, not the editor's own *bundled*
// firmware/currentVersion.json (which is a different schema, used by the
// local-first firmware updater). It used to be hand-maintained and silently
// drifted (still read editor 1.1.1 / firmware 3.0.3 after the 1.2.0/3.0.4
// release). Generate it from the same sources of truth as the rest of the
// release so it can't drift like that again.
function buildVersionCheckManifest() {
  const editorVersion = require(path.join(webPackageRoot, 'package.json')).version;
  const firmwareManifestPath = path.join(repoRoot, 'firmware', 'currentVersion.json');
  const firmwareVersion = JSON.parse(fs.readFileSync(firmwareManifestPath, 'utf8')).firmware.version;

  return { editor: { version: editorVersion }, firmware: { version: firmwareVersion } };
}

function uploadVersionCheckManifest(sshServer, normalizedLocation) {
  const remoteFirmwareDir = `${path.dirname(normalizedLocation)}/firmware`;
  const manifest = buildVersionCheckManifest();
  const tmpFile = path.join(os.tmpdir(), `boppad-currentVersion-${process.pid}.json`);

  fs.writeFileSync(tmpFile, `${JSON.stringify(manifest, null, 2)}\n`);
  try {
    runSsh(sshServer, `mkdir -p ${quoteForShell(remoteFirmwareDir)}`);
    scpUploadFile(sshServer, path.dirname(tmpFile), path.basename(tmpFile), remoteFirmwareDir);
    runSsh(sshServer, `mv ${quoteForShell(`${remoteFirmwareDir}/${path.basename(tmpFile)}`)} ${quoteForShell(`${remoteFirmwareDir}/currentVersion.json`)}`);
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

const { unrecognizedArgs, target, dryRun } = parseArgs(process.argv.slice(2));

if (unrecognizedArgs.length > 0) {
  console.warn(`Ignoring unrecognized argument(s): ${unrecognizedArgs.join(' ')}`);
}

const { sshServer, sshLocation, targetLabel } = resolveDeployEnv(target);

if (!fs.existsSync(buildDir)) {
  console.error('Web build output not found. Run "npm run build --workspace boppad-editor" first.');
  process.exit(1);
}

if (!sshServer || !sshLocation) {
  console.error(
    'Set BP_WEB_SSH_SERVER and BP_WEB_SSH_LOCATION (or a BP_WEB_<TARGET>_* pair, or the shared KB_WEB_* / KB_* vars) before deploying the web build.',
  );
  process.exit(1);
}

const normalizedLocation = sshLocation.replace(/\/+$/, '');
const destination = `${sshServer}:${normalizedLocation}/`;

// A CHANGELOG at the web package root (if present) is uploaded alongside the
// build so the served copy stays current; harmlessly skipped when absent.
const changelogName = 'CHANGELOG.md';
const hasChangelog = fs.existsSync(path.join(webPackageRoot, changelogName));

console.log(`Deploying ${targetLabel} web build from ${buildDir} to ${destination}${dryRun ? ' [dry run]' : ''}`);

if (dryRun) {
  const entries = fs.readdirSync(buildDir);
  console.log(`[dry run] would upload ${entries.length} top-level build entr${entries.length === 1 ? 'y' : 'ies'} via scp -r (upload/overwrite only; siblings not present locally are NOT removed):`);
  console.log(`[dry run]   ${entries.join(', ')}`);
  if (hasChangelog) {
    console.log(`[dry run] would also upload ${changelogName} from ${webPackageRoot}`);
  }
  const previewManifest = buildVersionCheckManifest();
  console.log(`[dry run] would write ${path.dirname(normalizedLocation)}/firmware/currentVersion.json: editor ${previewManifest.editor.version}, firmware ${previewManifest.firmware.version}`);
  console.log(`[dry run] would then best-effort chgrp ${remoteGroup} + normalize perms under ${normalizedLocation}`);
  process.exit(0);
}

runSsh(sshServer, `mkdir -p ${quoteForShell(normalizedLocation)}`);
scpUploadDirectoryContents(sshServer, buildDir, normalizedLocation);

if (hasChangelog) {
  console.log(`Uploading ${changelogName} to ${destination}`);
  scpUploadFile(sshServer, webPackageRoot, changelogName, normalizedLocation);
}

const remoteFirmwareDir = `${path.dirname(normalizedLocation)}/firmware`;
console.log(`Writing ${remoteFirmwareDir}/currentVersion.json (online version-check manifest)`);
uploadVersionCheckManifest(sshServer, normalizedLocation);

console.log(`Syncing remote group ${remoteGroup} under ${normalizedLocation} and ${remoteFirmwareDir}`);
syncRemoteGroupAndPermissions(sshServer, normalizedLocation);
syncRemoteGroupAndPermissions(sshServer, remoteFirmwareDir);

process.exit(0);
