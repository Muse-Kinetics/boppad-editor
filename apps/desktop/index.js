// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

'use strict';

// require('./modules/analytics')
const path = require('path')
const os = require('os')
const { app, Menu, BrowserWindow, Tray, nativeImage } = require('electron')
const { autoUpdater } = require("electron-updater")
const log = require('electron-log')
const { templateMenu, store } = require('./modules/templateMenu')

// adds debug features like hotkeys for triggering dev tools and reload
// require('electron-debug')();

// prevent window being garbage collected
let mainWindow;

let windowOptions = {
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
  },
	backgroundColor: '#2d2d2d',
	height: 860,
	show: false,
	icon: path.join(__dirname, 'build-assets/icons/png/64x64.png')
}

if(process.platform === 'darwin'){
	windowOptions.titleBarStyle = 'hidden'
	windowOptions.width = 830
} else if(process.platform === 'win32'){
	windowOptions.width = 860
	// Windows' window chrome (title bar + menu bar) eats more vertical space
	// than macOS's hidden-titlebar chrome does at the same requested height,
	// clipping the bottom row (All Quadrant / Unison buttons) and forcing a
	// scrollbar. Bump height to compensate — width/mac unaffected.
	windowOptions.height += 45
	app.commandLine.appendSwitch('--enable-midi-manager-dynamic-instantiation', 'disabled')
	app.commandLine.appendSwitch('enable-midi-manager-dynamic-instantiation', 'disabled')
	// use-winrt-midi-api
	/*
	if(os.release().indexOf('10') !== -1){
		app.commandLine.appendSwitch('--use-winrt-midi-api', 'enabled')
		app.commandLine.appendSwitch('use-winrt-midi-api', 'enabled')
	}
	*/
} else if(process.platform === 'linux'){
	windowOptions.width = 860
}

app.on('ready', () => {
	const menu = Menu.buildFromTemplate(templateMenu)
	Menu.setApplicationMenu(menu)

	mainWindow = createMainWindow(windowOptions);

	mainWindow.once('ready-to-show', () => {
		mainWindow.show()
	});

	mainWindow.webContents.on('did-finish-load', (event, url) => {
		// on startup, send render process message with tooltip state
		mainWindow.webContents.send('toggle-tooltips', store.get('showtooltips'));
	})

	autoUpdater.logger = log;
	autoUpdater.logger.transports.file.level = 'info';
	log.info('App starting...');
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.

  if (mainWindow === null) {
    mainWindow = createMainWindow(windowOptions)
		mainWindow.once('ready-to-show', () => {
			mainWindow.show()
		});
  }
})

function onClosed() {
	mainWindow = null;
}

function createMainWindow(options) {
	const win = new BrowserWindow(options);

	win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
	win.on('closed', onClosed);

	return win;
}