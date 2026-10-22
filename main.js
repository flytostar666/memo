const fs = require("node:fs");
const path = require("node:path");

const diagnosticLogFile = process.env.STAR_MEMO_DIAGNOSTIC_LOG;
function diagnosticLog(stage, details = "") {
  if (!diagnosticLogFile) {
    return;
  }

  try {
    fs.appendFileSync(
      diagnosticLogFile,
      `${new Date().toISOString()} ${stage}${details ? ` ${details}` : ""}\n`,
    );
  } catch {
    // Diagnostic logging must never block application startup.
  }
}

diagnosticLog("main-module-loaded");
process.on("uncaughtException", (error) => {
  diagnosticLog("uncaught-exception", error.stack ?? error.message);
});
process.on("unhandledRejection", (error) => {
  diagnosticLog("unhandled-rejection", String(error));
});

const { app, BrowserWindow } = require("electron");
diagnosticLog("electron-module-loaded");

function copyStorageDirectory(source, target) {
  if (!fs.existsSync(source)) {
    return false;
  }

  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === "LOCK") {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyStorageDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  return true;
}

function configureUserDataDirectory() {
  diagnosticLog("user-data-resolution-started");
  const appDataDirectory = app.getPath("appData");
  diagnosticLog("app-data-directory-resolved", appDataDirectory);
  const targetDirectory = path.join(appDataDirectory, "star备忘录");
  const legacyDirectories = [
    path.join(appDataDirectory, "拾光备忘录"),
    path.join(appDataDirectory, "shiguang-memo"),
  ];

  const targetStorage = path.join(targetDirectory, "Local Storage");
  const targetHasStorage =
    fs.existsSync(targetStorage) &&
    fs.readdirSync(targetStorage, { withFileTypes: true }).length > 0;
  if (!targetHasStorage) {
    for (const legacyDirectory of legacyDirectories) {
      const legacyStorage = path.join(legacyDirectory, "Local Storage");
      if (!fs.existsSync(legacyStorage)) {
        continue;
      }

      try {
        copyStorageDirectory(legacyStorage, targetStorage);
        diagnosticLog("legacy-storage-copied", legacyDirectory);
      } catch (error) {
        diagnosticLog("legacy-storage-copy-failed", error.message);
      }
      break;
    }
  }

  app.setPath("userData", targetDirectory);
  diagnosticLog("user-data-path-set", targetDirectory);
}

configureUserDataDirectory();
app.setName("star备忘录");
diagnosticLog("user-data-configured", app.getPath("userData"));

const hasSingleInstanceLock = app.requestSingleInstanceLock();
diagnosticLog("single-instance-lock", String(hasSingleInstanceLock));
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
    diagnosticLog("app-ready");
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
    diagnosticLog("browser-window-created");

    mainWindow.removeMenu();
    mainWindow.loadFile(path.join(__dirname, "preview-star.html"));
    mainWindow.webContents.on("did-finish-load", () => {
      diagnosticLog("page-loaded");
    });
    mainWindow.webContents.on(
      "did-fail-load",
      (_event, errorCode, errorDescription) => {
        diagnosticLog("page-load-failed", `${errorCode} ${errorDescription}`);
      },
    );
    mainWindow.webContents.on("render-process-gone", (_event, details) => {
      diagnosticLog("renderer-gone", JSON.stringify(details));
    });

    mainWindow.once("ready-to-show", () => {
      diagnosticLog("window-ready-to-show");
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

  app.on("child-process-gone", (_event, details) => {
    diagnosticLog("child-process-gone", JSON.stringify(details));
  });
}
