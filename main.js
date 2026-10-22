const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const hasSingleInstanceLock = app.requestSingleInstanceLock();
let mainWindow;

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId("com.flytostar.memo");

    mainWindow = new BrowserWindow({
      width: 1180,
      height: 860,
      minWidth: 760,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: "#f4f1e9",
      icon: path.join(__dirname, "build", "icon.ico"),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    mainWindow.removeMenu();
    mainWindow.loadFile(path.join(__dirname, "index.html"));

    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    mainWindow.webContents.on("will-navigate", (event, url) => {
      if (!url.startsWith("file://")) {
        event.preventDefault();
      }
    });

    mainWindow.on("closed", () => {
      mainWindow = undefined;
    });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}
