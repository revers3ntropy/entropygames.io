import {reloadScriptsOnEntities} from "./scripts";
import { state, ctx, canvas, setState, states, projectID, setSelected } from "./state";
import {reRender, reRenderCanvas, reRenderCanvasDebug, reRenderSceneToolbar} from "./renderer";

import { rect, getMousePos, v2, Entity, Scene, Camera, GUIElement, Transform, Collider} from 'entropy-engine';

window.addEventListener('click', () => {
    $('#pop-up').css('visibility', 'hidden');

    // cleans up add-component window
    // in timeout just to make sure it gets the click if you clicked on a button in the menu first
    const popup = $('.add-component-popup');
    
    if (!popup.length) return;
    
    popup.remove();
});

document.addEventListener('contextmenu', _ => {
    $('#pop-up').css('visibility', 'hidden');
});

window.onPropertyChange = (id: string, componentName: string, componentPropertyChain: string[], parser: (v: string) => any) => {
    let value = $(`#${id}`).val()?.toString() || '';

    let component;
    if (componentName === 'nocomponent') {
        component = state.selectedEntity;
    } else {
        component = state.selectedEntity?.getComponent(componentName);
    }

    let toChange: any = component;
    for (let i = 0; i < componentPropertyChain.length-1; i++) {
        toChange = toChange[componentPropertyChain[i]];
    }

    if (parser) {
        value = parser(value);
    }

    const lastPropertyName = componentPropertyChain[componentPropertyChain.length-1];

    toChange[lastPropertyName] = value;

    reRender();
};

window.setParent = (id: string | number) => {
    const name = $(`#${id}`).val();
    state.selectedEntity?.transform.setParentDirty(window.findNodeWithName(name));

    reRender();
}

$(document).keydown(event => {
    // If Control or Command key is pressed and the S key is pressed
    // run save function. 83 is the key code for S.
    if ((event.ctrlKey || event.metaKey) && event.which === 83) {
        window.save();
        event.preventDefault();
        return false;
    }
});

const runButton = document.getElementById('run');
if (!runButton) {
    throw 'no run button';
}

window.run = async () => {
    if (!ctx) {
        throw 'context is not defined';
    }

    state.running = true;
    await window.backgroundSave();
    await reloadScriptsOnEntities();

    setState(states.gameView);
    reRender();

    rect(ctx, v2.zero, canvas.width, canvas.height, `rgb(255, 255, 255)`, 0);

    const playButton = $('#run');

    playButton.css({
        'background': 'none',
        'background-color': 'var(--text-colour)',
        'height': '15px',
        'width': '15px',
        'margin': '2px 35px'
    });

    // if you add another listener then it will run this function before reloading,
    // which saves the project - not good
    runButton.onclick = () => {
        localStorage.statewindow = states.sceneView;
        window.location.reload();
    };

    $('#save, #build-button, #share').remove();

    state.eeReturns.run();
};

canvas.onwheel = event => {
    event.preventDefault();
    if (state.window !== states.sceneView) return;

    if (!state.sceneCamera) {
        throw 'no camera found';
    }

    const cam = state.sceneCamera.getComponent<Camera>('Camera');

    cam.zoom *= 1 + (event.deltaY * -0.0001);

    cam.zoom = Math.min(Math.max(5*10**-3, cam.zoom), 5*10**2);

    state.sceneCamera.transform.position.z += event.deltaY / 1000;

    reRenderCanvas();
    reRenderCanvasDebug();
    reRenderSceneToolbar();
};

export function setSelectedSpriteFromClick (pos: v2) {
    if (!ctx) throw 'no ctx';

    let touching = [];
    for (let sprite of Scene.activeScene.entities) {
        for (const component of sprite.components) {
            if (component.type === 'GUIElement') {
                if ((component as GUIElement).touchingPoint(pos, ctx, sprite.transform)) {
                    touching.push(sprite);
                }
            }

            if (component.type === 'Collider') {
                if ((component as Collider).overlapsPoint(sprite.transform, pos)) {
                    touching.push(sprite);
                }
            }
        }
    }

    if (touching.length === 0) {
        setSelected(null);
    } else {
        // TODO: sort by z position here
        setSelected(touching[0]);
    }
    reRender();
}

window.goToBuildMenu = async () => {
    await window.backgroundSave();
    window.location.href = `../build/?p=${projectID}`;
};

const sceneSelect = $('#scene-select');

window.setScene = () => {
    Scene.active = parseInt(sceneSelect.val()?.toString() || '0') || 0;
    setSelected(Scene.activeScene.entities[0]);
    sessionStorage.sceneID = Scene.active;
    reRender();
};

canvas.addEventListener('click', event => {
    if (state.window !== states.sceneView) return;
    const mousePos = getMousePos(canvas, event);
    const clickPos = state.sceneCamera?.getComponent<Camera>('Camera')
        .screenSpaceToWorldSpace(mousePos, canvas, state.sceneCamera.transform.position);
    if (clickPos) {
        setSelectedSpriteFromClick(clickPos);
    }
});


canvas.addEventListener('mousedown', event => {
    if (event.button !== 2) return;
    state.dragStart = getMousePos(canvas, event);
    state.dragging = true;
});

canvas.addEventListener('contextmenu', event => {
    event.preventDefault();
}, false);

canvas.addEventListener('mouseup', event => {
    if (event.button !== 2) return;
    state.dragging = false;
});

function drag (event: MouseEvent) {
    state.dragEnd = getMousePos(canvas, event);
    const diff = state.dragEnd.clone.sub(state.dragStart);

    const camZoom = state.sceneCamera?.getComponent<Camera>('Camera').zoom ?? 1;

    diff.scale(1/camZoom);
    // reverse to drag naturally in the right direction
    diff.scale(-1);
    state.sceneCamera?.transform.localPosition.add(diff.v3);
    state.dragStart = state.dragEnd;

    reRenderCanvas();
    reRenderCanvasDebug();
    reRenderSceneToolbar();
}

canvas.addEventListener('mousemove', evt => {
    if (!Camera.main) return;
    if (state.window !== states.sceneView) return;
    if (!state.sceneCamera) return;

    // update world and screen space values in scene view toolbar

    const screenSpace = getMousePos(canvas, evt);
    const worldSpace = state.sceneCamera.getComponent<Camera>('Camera')
        .screenSpaceToWorldSpace(screenSpace, canvas, state.sceneCamera.transform.position);

    const worldSpaceDIV = $('#world-space-pos');
    const screenSpaceDIV = $('#screen-space-pos');

    worldSpaceDIV.html(`
        ${worldSpace.x.toFixed(2)} | ${worldSpace.y.toFixed(2)}
    `);

    screenSpaceDIV.html(`
        ${screenSpace.x.toFixed(2)} | ${screenSpace.y.toFixed(2)}
    `);

    if (state.dragging) drag(evt);

}, false);

canvas?.parentNode?.addEventListener('resize', () => {
    reRender();
});

// for type Entity in the inspector
window.findSpriteWithName = (name: string) => {
    return Entity.find(name);
};

// if no entity is found with that name, then the active scene is used instead
window.findNodeWithName = (name: string) => {

    let node: Transform | number | undefined = Entity.find(name)?.transform;

    node ??= Scene.active;

    return node;
};