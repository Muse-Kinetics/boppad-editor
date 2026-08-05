// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

// Preload: the only bridge between the main process and the (context-isolated,
// node-integration-disabled) renderer. Exposes a minimal, whitelisted API so the
// renderer never gets raw ipcRenderer or Node access.
const { contextBridge, ipcRenderer } = require('electron');

// Main → renderer channels the UI subscribes to (see index.html).
const RECEIVE_CHANNELS = [
  'firmware-update',
  'preset-export',
  'preset-import',
  'preferences',
  'usertables',
  'toggle-tooltips',
  'downloading-update',
  'downloading-update-complete',
];

contextBridge.exposeInMainWorld('boppadDesktop', {
  // on(channel, listener): subscribe to a whitelisted main→renderer message.
  // The listener is called as (event, ...args); event is passed as undefined so
  // the raw IpcRendererEvent is never exposed to the renderer.
  on(channel, listener) {
    if (typeof listener !== 'function' || !RECEIVE_CHANNELS.includes(channel)) {
      return;
    }
    ipcRenderer.on(channel, (_event, ...args) => listener(undefined, ...args));
  },
});
