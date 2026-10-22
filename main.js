const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

function configureUserDataDirectory() {
  const appDataDirectory = app.getPath("appData");
  const targetDirectory = path.join(appDataDirectory, "star备忘录");
  const legacyDirectories = [
    path.join(appDataDirectory, "拾光备忘录"),
    path.join(appDataDirectory, "shiguang-memo"),
  ];

  if (!fs.existsSync(targetDirectory)) {
    const legacyDirectory = legacyDirectories.find((directory) =>
      fs.existsSync(directory),
    );
    if (legacyDirectory) {
      fs.cpSync(legacyDirectory, targetDirectory, { recursive: true });
    }
  }

  app.setPath("userData", targetDirectory);
}

configureUserDataDirectory();
app.setName("star备忘录");

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
      backgroundColor: "#030510",
      icon: path.join(__dirname, "build", "icon.ico"),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    mainWindow.removeMenu();
    mainWindow.loadFile(path.join(__dirname, "preview-star.html"));

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
