#!/usr/bin/env node
// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.
// Build the web editor and sync its output into the desktop app's renderer/ dir.
// This replaces the old manual bundle.js/index.html/style.css copy between the
// two former repos — the desktop now always ships the current web build.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const webDir = path.resolve(__dirname, '..', '..', 'web');
const webBuild = path.join(webDir, 'build');
const rendererDir = path.resolve(__dirname, '..', 'renderer');

console.log('>> building web editor…');
// execSync always goes through a shell, so it resolves npm.cmd on Windows and
// npm on POSIX without the EINVAL that execFileSync hits spawning .cmd files.
execSync('npm run build', { cwd: webDir, stdio: 'inherit' });

if (!fs.existsSync(webBuild)) {
  throw new Error(`web build output not found at ${webBuild}`);
}

console.log('>> syncing web build → desktop renderer/');
fs.rmSync(rendererDir, { recursive: true, force: true });
fs.cpSync(webBuild, rendererDir, { recursive: true });
console.log('renderer synced.');
