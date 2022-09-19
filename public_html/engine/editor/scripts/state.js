import {reRender} from "./renderer";
import {reloadScriptsOnEntities} from "./scripts";

import * as ee from "entropy-engine";

export const projectID = window.urlParam('p');

if (!projectID) {
	throw 'no project id specified';
}

window.apiToken.project = parseInt(projectID);

window.parseBool = (s) => s === 'true';

export const canvasID = 'myCanvas';
const c = document.getElementById(canvasID);
if (!(c instanceof HTMLCanvasElement)) {
	throw 'canvas not a canvas';
}
export const canvas = c;
export const ctx = c.getContext('2d');

if (!ctx) {
	throw 'context is not defined';
}

// scripts script
/** @type {Record<string, string>}*/
export const scripts = {};
/** @type {Record<string, string>}*/
export const scriptURLS = {};

/**
 * @param {string} script
 */
window.switchScripts = (script) => {
	state.currentScript = script;
	localStorage.currentScript = script;
	reRender();
};

export function numScripts () {
	return Object.keys(scripts).length;
}

// window state management
export const states = {
	sceneView: 0,
	scriptEditor: 1,
	gameView: 2,
	assets: 3,
	sceneSettings: 4,
	comments: 5
}
window.sceneView = states.sceneView;
window.scriptEditor = states.scriptEditor;
window.gameView = states.gameView;
window.assets = states.assets;
window.sceneSettings = states.sceneSettings;
window.comments = states.comments;

export const state = {
	window: parseInt(localStorage.statewindow) ?? states.sceneView,
	eeReturns: {},
	currentScript: localStorage.currentScript ?? '',
	dragging: false,
	dragStart: ee.v2.zero,
	dragEnd: ee.v2.zero,
	sceneCamera: null,
	selectedEntity: null,
	running: false
};

export const setSelected = (sprite) => void (state.selectedEntity = sprite);

export const setState = async (newState) => {
	if (state.window === newState) return;

	await reloadScriptsOnEntities();
	localStorage.statewindow = newState;

	state.window = newState;
	reRender();
};
window.setState = setState;

// effects
$('#share').attr('href', (_, v) => v + projectID);
$('#build-button').attr('href', (_, v) => v + projectID);