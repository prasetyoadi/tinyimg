const { dialog, TouchBar } = require('electron');
const nativeImage = require('electron').nativeImage;
const path = require('path');

const { TouchBarButton } = TouchBar;

/** Touchbar support */
const touchBarResult = new TouchBarButton({
	label: 'Let me tiny your image!',
	backgroundColor: '#000000',
	click: () => {
		dialog.showOpenDialog({
			properties: ['openFile', 'multiSelections']
		}).then(result => {
			if (result.canceled) {
				return;
			}
			for (let filePath of result.filePaths) {
				processFile(filePath, path.basename(filePath));
			}
		}).catch(err => {
			log.error(err);
		});
	}
});

let touchBarIcon = new TouchBarButton({
	backgroundColor: '#000000',
	'icon': nativeImage.createFromPath(path.join(__dirname, 'assets/icons/png/16x16.png')),
	iconPosition: 'center'
});

const touchBar = new TouchBar({
	items: [
		touchBarResult,
	]
});

/** Add Touchbar icon */
touchBar.escapeItem = touchBarIcon;

module.exports = {
	touchBar,
	touchBarIcon,
	touchBarResult,
};