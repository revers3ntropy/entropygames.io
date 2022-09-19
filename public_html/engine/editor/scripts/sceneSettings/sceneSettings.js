import { colour, Scene } from "entropy-engine";

window.changeSceneSettings = (key, id) => {
	const value = $(`#${id}`).val();
	let toChange = Scene.activeScene.settings;
	toChange[key] = value;
}

function _colour_ (key, value, id) {
	return `
		<input 
			type="color" 
			id="${id}" 
			value="${value.hex}" 
			onchange="window.changeSceneSettings('${key}', '${id}')"
		>
	`;
}

function _numberOrString_ (key, value, id, isNum) {
	return `
		<input 
			type="${isNum ? 'number' : 'text'}"
			id="${id}"
			value="${value}"
			onchange="window.changeSceneSettings('${key}', '${id}')"
		>
	`;
}

function _setting_ ({
	settings,
	key,
	showName = key,
	type = typeof settings[key]
}) {

	const id = `input-${key}-${showName}`;

	let showValue = `
		<div>
			${showName}: 
	`;

	switch (type) {
		case 'number':
			showValue += _numberOrString_(key, settings[key], id, true);
			break;
		case 'string':
			showValue += _numberOrString_(key, settings[key], id, false);
			break;
	}

	showValue += '</div>';

	return showValue;
}

const settingShowNames = {
	license: 'License',
	version: 'Version',
	gameName: 'Game Name',
	maxFrameRate: 'Max Frame Rate',
	timeScale: 'Time Scale',
	background: 'Background',
	globalGravity: 'Gravity',
	collisionIterations: 'Collision Accuracy',
	globalVolume: 'Sound Volume Multiplier'
}

const excludedSettings = [
	'ctx',
	'canvasID',
]

export function renderSceneSettings (div) {
	const settings = Scene.activeScene.settings;

	div.html(``);

	for (let setting in settings) {
		if (excludedSettings.includes(setting)) {
			continue;
		}
		div.append(_setting_({
			settings,
			key: setting,
			showName: settingShowNames[setting],
		}));
	}
}