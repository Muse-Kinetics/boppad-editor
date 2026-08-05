// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

const { BrowserWindow, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

let updater;

autoUpdater.autoDownload = false;

autoUpdater.on("error", (event, error) => {
  dialog.showErrorBox(
    "Error: ",
    error == null ? "unknown" : (error.stack || error).toString()
  );
});

autoUpdater.on("update-available", () => {
  let mainWindow = BrowserWindow.getAllWindows()[0];
  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      title: "Found Updates",
      message: "Found updates, do you want update now?",
      buttons: ["Install", "Later"],
      defaultId: 0,
    })
    .then((buttonIndex) => {
      if (buttonIndex.response === 0) {
        autoUpdater.downloadUpdate();
        mainWindow.webContents.send("downloading-update");
      } else {
        updater.enabled = true;
        updater = null;
      }
    });
});

autoUpdater.on("update-not-available", (e) => {
  let mainWindow = BrowserWindow.getAllWindows()[0];
  dialog.showMessageBox(mainWindow, {
    title: "No Updates Available",
    message: `Version ${e.version} is the latest BopPad Editor`,
    detail: "",
  });

  updater.enabled = true;
  updater = null;
});

autoUpdater.on("download-progress", (progressObj) => {
  let mainWindow = BrowserWindow.getAllWindows()[0];
  // Use values 0 to 1, or -1 to hide the progress bar
  if (mainWindow != null) mainWindow.setProgressBar(progressObj.percent / 100);
});

autoUpdater.on("update-downloaded", () => {
  let mainWindow = BrowserWindow.getAllWindows()[0];
  dialog.showMessageBox(mainWindow, {
      title: "Install Updates",
      message: `Version downloaded, application will quit to update...`,
    })
    .then(() => {
      setImmediate(() => autoUpdater.quitAndInstall());
      mainWindow.webContents.send("downloading-update-complete");
    });
});

// export this to MenuItem click callback
function checkForUpdates(menuItem, mainWindow, event) {
  updater = menuItem;
  updater.enabled = false;
  autoUpdater.checkForUpdates();
}

module.exports.checkForUpdates = checkForUpdates;
