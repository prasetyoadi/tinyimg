const { ipcRenderer, shell } = require('electron');
const { dialog } = require('electron').remote;
const path = require('path');
const log = require('electron-log');

const dragzone = document.getElementById('dragzone');

/*
 * Open filepicker
 */
dragzone.onclick = () => {
	dialog.showOpenDialog(
		{
			properties: ['openFile', 'multiSelections']
		}).then(result => {

			if (result.canceled) {
				return;
			}

			// Add loader
			dragzone.classList.add('is--processing');

			for (let f of result.filePaths) {
				let filename = path.parse(f).base;
				ipcRenderer.send('tinyimg', filename, f);
			}

		}).catch(err => {
			log.error(err);
		});

};

document.ondragover = () => {
	dragzone.classList.add('drag-active');
	return false;
};

document.ondragleave = () => {
	dragzone.classList.remove('drag-active');
	return false;
};

document.ondragend = () => {
	dragzone.classList.remove('drag-active');
	return false;
};

/*
 * Action on drag drop
 */
document.ondrop = e => {
	e.preventDefault();

	const { traverseFileTree } = require('./core');

	let items = e.dataTransfer.items;
	for (let i = 0; i < items.length; i++) {
		// webkitGetAsEntry is where the magic happens
		let item = items[i].webkitGetAsEntry();
		if (item) {
			traverseFileTree(item);
		}
	}

	dragzone.classList.add('is--processing');
	dragzone.classList.remove('drag-active');

	return false;
};

// Close on pressing ESC
document.onkeyup = e => {
	if (e.key === 'Escape') {
		menuSettings.classList.remove('is--open');
	}
};

/*
 * Renderer process
 */
ipcRenderer.on('isTiny', (event, path, sizeBefore, sizeAfter) => {
	const percent = Math.round((100 / sizeBefore) * (sizeBefore - sizeAfter));

	// Remove loader
	dragzone.classList.remove('is--processing');

	// Create container
	const resContainer = document.createElement('div');
	resContainer.className = 'resLine';
	resContainer.innerHTML =
		'<span>You saved ' +
		percent +
		'%. Your shrunken image is here:</span><br>';

	// Create link
	let resElement = document.createElement('a');
	resElement.setAttribute('href', '#');
	let resText = document.createTextNode(path);
	resElement.appendChild(resText);

	// Add click event
	resElement.onclick = el => {
		el.preventDefault();
		shell.showItemInFolder(path);
	};

	resContainer.appendChild(resElement);
}).on('openSettings', () => {
	menuSettings.classList.add('is--open');
}).on('error', () => {
	// Remove loader
	dragzone.classList.remove('is--processing');
});

