const { app, dialog, ipcRenderer } = require('electron');
const fs = require('fs');
const execFile = require('child_process').execFile;
const mozjpeg = require('mozjpeg');
const pngquant = require('pngquant-bin');
const makeDir = require('make-dir');
const gifsicle = require('gifsicle');
const svgo = require('svgo');
const path = require('path');
const settings = require('electron-settings');

/**
 * Generate new path to shrunken file
 * @param  {string} pathName Filepath
 * @return {object}         filepath object
 */
const generateNewPath = (pathName) => {

	let objPath = path.parse(pathName);

	if (settings.getSync('folderswitch') === false &&
		typeof settings.getSync('savepath') !== 'undefined') {
		objPath.dir = settings.getSync('savepath')[0];
	}

	if (settings.getSync('subfolder')) {
		objPath.dir = objPath.dir + '/minified';
	}

	makeDir.sync(objPath.dir);

	/** Suffix setting */
	const suffix = settings.getSync('suffix') ? '.min' : '';
	objPath.base = objPath.name + suffix + objPath.ext;

	return path.format(objPath);
};

/**
 * Calculate filesize
 * @param  {string} filePath Filepath
 * @param  {boolean} mb     If true return as MB
 * @return {number}         filesize in MB or KB
 */
const getFileSize = (filePath, mb) => {
	const stats = fs.statSync(filePath);

	if (mb) {
		return stats.size / 1024;
	}

	return stats.size;
};

/**
 * Send data to renderer script
 * @param  {object} err      Error message
 * @param  {string} newFile  New filename
 * @param  {number}  sizeOrig Original filesize
 */
const sendToRenderer = (mainWindow, err, newFile, sizeOrig) => {
	if (!err) {
		let sizeShrinked = getFileSize(newFile, false);
		mainWindow.webContents.send(
			'isTiny',
			newFile,
			sizeOrig,
			sizeShrinked
		);
	} else {
		log.error(err);
		mainWindow.webContents.send('error');
		dialog.showMessageBoxSync({
			'type': 'error',
			'message': 'I\'m not able to write your new image. Sorry! Error: ' + err
		});
	}
};

/**
 * Processing tiny the image
 * @param  {string} filePath Filepath
 * @param  {string} fileName Filename
 */
const processFile = (touchBarResult, mainWindow, filePath, fileName) => {
	/** Focus window on drag */
	!mainWindow || mainWindow.focus();

	/** Change Touchbar */
	touchBarResult.label = 'I am tinyize for you';

	/** Get filesize */
	let sizeOrig = getFileSize(filePath, false);

	/** Process image(s) */
	fs.readFile(filePath, 'utf8', (err, data) => {

		if (err) {
			throw err;
		}

		app.addRecentDocument(filePath);
		const newFile = generateNewPath(filePath);

		switch (path.extname(fileName).toLowerCase()) {
			case '.svg':
				{
					const svg = new svgo();
					svg.optimize(data).then((result) => {
						fs.writeFile(newFile, result.data, (err) => {
							touchBarResult.label = `Your shrunken image: ${newFile}`;
							sendToRenderer(mainWindow, err, newFile, sizeOrig);
						});
					}).catch((error) => {
						dialog.showErrorBox('Error', error.message);
					});
					break;
				}
			case '.jpg':
			case '.jpeg':
				{
					execFile(mozjpeg, ['-optimize', '-progressive', '-quality', 40, '-outfile', newFile, filePath], (err) => {
						touchBarResult.label = `Your shrunken image: ${newFile}`;
						sendToRenderer(mainWindow, err, newFile, sizeOrig);
					});

					break;
				}
			case '.png':
				{
					execFile(pngquant, ['--speed', 1, '--quality', 60, '-fo', newFile, filePath], (err) => {
						touchBarResult.label = `Your shrunken image: ${newFile}`;
						sendToRenderer(mainWindow, err, newFile, sizeOrig);
					});
					break;
				}
			case '.gif':
				{
					execFile(gifsicle, ['-o', newFile, filePath, '-O=2', '-i'], (err) => {
						touchBarResult.label = `Your shrunken image: ${newFile}`;
						sendToRenderer(mainWindow, err, newFile, sizeOrig);
					});
					break;
				}
			default:
				mainWindow.webContents.send('error');
				dialog.showMessageBoxSync({
					'type': 'error',
					'message': 'Only PNG SVG, JPG and GIF allowed'
				});
		}
	});
};

const traverseFileTree = (item, path) => {
	const exclude = ['.DS_Store'];
	path = path || '';

	if (item.isFile) {
		// Get file
		item.file(function (f) {
			if (fs.statSync(f.path).isDirectory() || exclude.includes(f.name)) {
				dragzone.classList.remove('drag-active');

				return false;
			}

			ipcRenderer.send('tinyimg', f.name, f.path, f.lastModified);
		});
	} else if (item.isDirectory) {
		// Get folder contents
		const dirReader = item.createReader();
		dirReader.readEntries(function (entries) {
			for (let i in entries) {
				traverseFileTree(entries[i], path + item.name + '/');
			}
		});
	}
}

module.exports = {
	path,
	processFile,
	traverseFileTree
};