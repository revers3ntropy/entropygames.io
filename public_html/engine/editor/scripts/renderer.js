import { ctx, canvas, setSelected, state, setState, states } from "./state";
import {reRenderHierarchy} from "./hierarchy/renderHierarchy";
import {reRenderInspector} from "./inspector/renderInspector";
import {renderScripts} from "./script-editor/renderScript";
import {renderAssets} from './assets/renderAssets';
import {renderSceneMenu} from './renderSceneMenu';
import {renderComments} from './comments/renderComments';
import {renderSceneSettings} from "./sceneSettings/sceneSettings";

import { Scene, v2, Camera, Systems, Entity, rect, renderDebug, renderSelectedOutline, drawCameraViewArea } from "entropy-engine";

/**
 * Shows a popup menu at the cursor
 * @param {MouseEvent} event
 * @param {string} content
 */
export function showPopUpMenu (event: MouseEvent, content: string) {
    setTimeout(() => {
        const menu = $('#pop-up');

        menu.css('visibility', 'visible');
        menu.css('top', `${event.clientY}px`);
        menu.css('left', `${event.clientX}px`);

        $('#pop-up-content').html(content);

    }, 0);
}

/**
 *
 * @param {string} elementID
 * @param {Entity} selectEntity
 * @param {string} content
 */
export function setRightClick (elementID: string, selectEntity: Entity, content: string) {
    document.getElementById(elementID)?.addEventListener('contextmenu', event => {
        setSelected(selectEntity);
        reRender();
        showPopUpMenu(event, content);
        event.preventDefault();
    }, false);
}


export function rightClickOption (name: string, onclick: Function, show=name) {
    window[`rightclick-${name}`] = onclick;

    return (`
        <div>
            <button 
                class="empty-button" 
                onclick="window['rightclick-${name}']()"
                style="
                    border-radius: 5px;
                    width: 100%;
                    background-color: vaR(--transparent);
                "
            >
                ${show}
            </button>
        </div>
    `);
}

export function reRenderCanvas () {
    Systems.getByName('Renderer')?.Update(Scene.activeScene);
}

export function reRenderCanvasDebug () {
    if (!ctx) throw 'no ctx';
    if (!state.sceneCamera) throw 'no camera';

    renderDebug(canvas, ctx, state.sceneCamera, Scene.activeScene.entities);

    if (!state.selectedEntity) return;

    renderSelectedOutline(canvas, ctx, state.sceneCamera, state.selectedEntity);

    if (state.selectedEntity.hasComponent('Camera'))
        drawCameraViewArea(ctx, canvas, state.sceneCamera, state.selectedEntity, `rgb(255, 0, 0)`);
}

const canvasDIV = $('#canvas');
const sceneToolbar = $('#scene-toolbar');
const scriptsDIV = $('#scripts');
const assetsDIV = $('#assets');
const sceneSettingsDIV = $('#scene-settings');
const commentsDIV = $('#comments');

const scriptsButton = $(`#go-to-scripts-button`);
const sceneButton = $(`#go-to-scene-button`);
const gameButton = $('#go-to-game-button');
const assetButton = $('#go-to-assets-button');
const sceneSettingsButton = $('#go-to-scene-settings-button');
const commentsButton = $('#go-to-comments-button');

export function reRenderSceneToolbar () {
    renderSceneMenu(sceneToolbar);
}

export function reRender () {

    if (!ctx) throw 'no ctx';

    function setTabNotActive (tab: JQuery, div: JQuery) {
        tab.hover(() => {
            tab.css('background-color', 'var(--input-hover-bg)');
        }, () => {
            tab.css('background-color', 'var(--input-opposite-bg)');
        });

        tab.css('background-color', 'var(--input-opposite-bg)');
        tab.css('border-bottom', 'none');
        div.css('display', 'none');
    }

    function setTabActive (tab: JQuery, div: JQuery, useInLineDisplay=false) {
        tab.hover(() => {
            tab.css('background-color', 'var(--input-hover-bg)');
        }, () => {
            tab.css('background-color', 'var(--input-bg)');
        });

        tab.css('background-color', 'var(--input-bg)');
        tab.css('border-bottom', '3px sold blue');
        div.css('display', useInLineDisplay? 'inline':'flex');
    }

    sceneToolbar.css('height', '0');
    if (state.window !== states.sceneView)
        sceneToolbar.html('');

    switch (state.window) {
        case states.sceneView:
            setTabNotActive(scriptsButton, scriptsDIV);
            setTabNotActive(gameButton, canvasDIV);
            setTabActive(sceneButton, canvasDIV, true);
            setTabNotActive(assetButton, assetsDIV);
            setTabNotActive(sceneSettingsButton, sceneSettingsDIV);
            setTabNotActive(commentsButton, commentsDIV);

            if (!state.sceneCamera) throw 'no scene camera';
            Camera.main = state.sceneCamera;

            reRenderCanvas();
            reRenderCanvasDebug();
            reRenderSceneToolbar();
            
            sceneToolbar.css('height', '30px');
            break;

        case states.scriptEditor:
            setTabNotActive(sceneButton, canvasDIV);
            setTabActive(scriptsButton, scriptsDIV);
            setTabNotActive(gameButton, canvasDIV);
            setTabNotActive(assetButton, assetsDIV);
            setTabNotActive(sceneSettingsButton, sceneSettingsDIV);
            setTabNotActive(commentsButton, commentsDIV);

            rect(ctx, v2.zero, canvas.width, canvas.height, `rgb(255, 255, 255)`, 0);
            renderScripts('scripts');
            break;

        case states.gameView:
            Scene.activeScene.findMainCamera();

            setTabNotActive(sceneButton, canvasDIV);
            setTabNotActive(scriptsButton, scriptsDIV);
            setTabActive(gameButton, canvasDIV, true);
            setTabNotActive(assetButton, assetsDIV);
            setTabNotActive(sceneSettingsButton, sceneSettingsDIV);
            setTabNotActive(commentsButton, commentsDIV);

            reRenderCanvas();

            break;

        case states.assets:
            
            setTabNotActive(sceneButton, canvasDIV);
            setTabNotActive(scriptsButton, scriptsDIV);
            setTabNotActive(gameButton, canvasDIV);
            setTabActive(assetButton, assetsDIV, true);
            setTabNotActive(sceneSettingsButton, sceneSettingsDIV);
            setTabNotActive(commentsButton, commentsDIV);
            
            renderAssets(assetsDIV);

            break;
            
        case states.comments:

            setTabNotActive(sceneButton, canvasDIV);
            setTabNotActive(scriptsButton, scriptsDIV);
            setTabNotActive(gameButton, canvasDIV);
            setTabNotActive(assetButton, assetsDIV);
            setTabNotActive(sceneSettingsButton, sceneSettingsDIV);
            setTabActive(commentsButton, commentsDIV, true);

            renderComments(commentsDIV);
            break;

        case states.sceneSettings:
            setTabNotActive(sceneButton, canvasDIV);
            setTabNotActive(scriptsButton, scriptsDIV);
            setTabNotActive(gameButton, canvasDIV);
            setTabNotActive(assetButton, assetsDIV);
            setTabActive(sceneSettingsButton, sceneSettingsDIV, true);
            setTabNotActive(commentsButton, commentsDIV);

            renderSceneSettings(sceneSettingsDIV);
            break;

        default:
            console.error('Current window not recognised: ', state.window);
            setState(states.sceneView);
            reRender();
            break;
    }

    reRenderHierarchy();
    reRenderInspector();

}