const { app, BrowserWindow, ipcMain } = require('electron');
const log = require('electron-log');
const settings = require('electron-settings');
const { path, processFile } = require('./core');
const { touchBar, touchBarResult } = require('./touchbar');

global.debug = {
	devTools: 0
};

let mainWindow;

/**
 * Start logging in os log
 */
log.info('App starting...');

/**
 * Create the browser window
 */
const createWindow = () => {

	/** Create the browser window. */
	mainWindow = new BrowserWindow({
		titleBarStyle: 'hiddenInset',
		width: 350,
		height: 160,
		minWidth: 350,
		minHeight: 160,
		frame: true,
		backgroundColor: '#F7F7F7',
		resizable: false,
		show: true,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	});

	/** Show window when ready */
	mainWindow.on('ready-to-show', () => {
		mainWindow.show();
	});

	/** Load index.html of the app. */
	mainWindow.loadURL(path.join('file://', __dirname, '/index.html')).then(
		() => {
			/** Open the DevTools. */
			global['debug'].devTools === 0 ||
				mainWindow.webContents.openDevTools();
		}
	).catch(
		(error) => {
			log.error(error);
		}
	);

	/** Open the DevTools. */
	global['debug'].devTools === 0 || mainWindow.webContents.openDevTools();

	/** Window closed */
	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	/** Default settings */
	const defaultSettings = {
		suffix: true,
	};

	/** set missing settings */
	const newSettings = Object.assign({}, defaultSettings, settings.getSync());
	settings.setSync(newSettings);
	mainWindow.setTouchBar(touchBar);
	require('./menu');
};

app.on('will-finish-launching', () => {
	app.on('open-file', (event, filePath) => {
		event.preventDefault();
		processFile(touchBarResult, mainWindow, filePath, path.basename(filePath));
	});
});

/** Start app */
app.on('ready', () => {
	createWindow();
});

/** Quit when all windows are closed. */
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (mainWindow === null) {
		createWindow();
	}
});

/** When receiving a quitAndInstall signal, quit and install the new version ;) */
ipcMain.on('quitAndInstall', (event, arg) => {
	log.info(event);
	log.info(arg);
});

/** Main logic */
ipcMain.on(
	'tinyimg', (event, fileName, filePath) => {
		processFile(touchBarResult, mainWindow, filePath, fileName);
	}
);
