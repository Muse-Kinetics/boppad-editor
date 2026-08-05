// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

const fs = require('fs');
const isWin = process.platform === 'win32'
const { app, BrowserWindow, dialog } = require('electron');
const Store = require('electron-store');
const { checkForUpdates } = require('./updater');

const manualURL = 'https://files.keithmcmillen.com/products/boppad/documentation/boppad-manual.pdf',
      supportURL = 'https://support.keithmcmillen.com/hc/en-us/requests/new',
      windowsMidiServicesURL = 'https://microsoft.github.io/MIDI/get-latest/'

const store = new Store();

const templateMenu = [
  {
    label: 'Edit',
    submenu: [
      {role: 'undo'},
      {role: 'redo'},
      {type: 'separator'},
      {role: 'cut'},
      {role: 'copy'},
      {role: 'paste'}
    ]
  },
  {
    label: 'View',
    submenu: [
      {role: 'reload'},
      {role: 'forcereload'},
      {role: 'toggledevtools'},
      {type: 'separator'},
      {role: 'resetzoom'},
      {role: 'zoomin'},
      {role: 'zoomout'},
      {type: 'separator'},
      {role: 'togglefullscreen'}
    ]
  },
  {
    label: 'Presets',
    submenu: [
      {
        label: 'Import Presets',
        accelerator: 'CmdOrCtrl+I',
        click () {
          const mainWindow = BrowserWindow.getAllWindows()[0];

          // Modern promise-based dialog (the callback form was removed in newer Electron).
          dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [{name: 'JSON', extensions: ['json']}]
          }).then(function (result) {
            if (result.canceled || !result.filePaths.length) return;
            const importedPresets = fs.readFileSync(result.filePaths[0]);
            mainWindow.webContents.send('preset-import', JSON.parse(importedPresets));
          });
        }
      },
      {
        label: 'Export Presets',
        accelerator: 'CmdOrCtrl+E',
        click () {
          let mainWindow = BrowserWindow.getAllWindows()[0];
          if(mainWindow !== null) mainWindow.webContents.send('preset-export');
        }
      },
      {
        label: 'User Tables',
        click () {
          let mainWindow = BrowserWindow.getAllWindows()[0];
          if(mainWindow !== null) mainWindow.webContents.send('usertables');
        }
      }
    ]
  },
  {
    label: 'Hardware',
    submenu: [
      {
        label: 'Update Firmware',
        accelerator: 'CmdOrCtrl+F',
        click () {
          let mainWindow = BrowserWindow.getAllWindows()[0];
          if(mainWindow !== null) mainWindow.webContents.send('firmware-update');
        }
      },
      // WMS is Microsoft's own runtime/SDK, not ours to bundle an installer for
      // — same reasoning as the Qt editors' Help -> "Install Windows MIDI
      // Services" item (see 00_Editors/status_aug2026.md cross-cutting
      // findings); a link to Microsoft's own "get latest" page is the feature.
      ...(isWin ? [
        {type: 'separator'},
        {
          label: 'Install Windows MIDI Services',
          click () { require('electron').shell.openExternal(windowsMidiServicesURL) }
        }
      ] : [])
    ]
  },
  {
    role: 'window',
    submenu: [
      {role: 'minimize'},
      {role: 'close'}
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'BopPad Manual',
        click () { require('electron').shell.openExternal(manualURL) }
      },
      {
        label: 'Show Tooltips',
        accelerator: 'CmdOrCtrl+T',
        type: 'checkbox',
        checked: store.get('showtooltips'),
        click (item) {
          let mainWindow = BrowserWindow.getAllWindows()[0];
          if(mainWindow !== null) mainWindow.webContents.send('toggle-tooltips', item.checked);
          if(mainWindow !== null) store.set('showtooltips', item.checked);
        }
      },
      {
        label: 'Report an Issue',
        click () { require('electron').shell.openExternal(supportURL) }
      }
    ]
  }
];

if (process.platform === 'darwin') {
  templateMenu.unshift({
      label: 'BopPad Editor',
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click () {
            let mainWindow = BrowserWindow.getAllWindows()[0];
            if(mainWindow !== null) mainWindow.webContents.send('preferences');
          }
        },
        {
          label: 'Check For Updates',
          click (item) {
            let mainWindow = BrowserWindow.getAllWindows()[0];
            if(mainWindow !== null) checkForUpdates(item, mainWindow)
          }
        },
        {type: 'separator'},
        {role: 'hide'},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'}
      ]
  })
}

if (process.platform === 'win32') {
  templateMenu.unshift({
    label: 'File',
    submenu: [
      {
        label: 'Settings',
        accelerator: 'CmdOrCtrl+,',
        click () {
          let mainWindow = BrowserWindow.getAllWindows()[0];
          if(mainWindow !== null) mainWindow.webContents.send('preferences');
        }
      },
      {
        label: 'Check For Updates',
        click () {
          let mainWindow = BrowserWindow.getAllWindows()[0];
          if(mainWindow !== null) checkForUpdates(this, mainWindow)
        }
      },
      {
        label: 'Exit',
        accelerator: 'Alt+F4',
        click() {
          app.quit()
        }
      }
    ]
  })
}

if(process.platform === 'linux'){

}

module.exports.templateMenu = templateMenu
module.exports.store = store
