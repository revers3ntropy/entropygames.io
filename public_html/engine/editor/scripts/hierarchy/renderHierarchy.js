import {state, setSelected} from "../state";
import {Scene, Entity, Transform} from "entropy-engine";
import {reRender, rightClickOption, setRightClick} from "../renderer";
import {setRightClickAddEntityMenu} from "./rightClickCreateMenu";

const _entity_ = (entity: Entity, selected: boolean): string => `
    <div style="margin: 0; padding: 0" id="entity${entity.id}">
        <button
            class="empty-button"
            style="
                background-color: ${selected ? 'var(--input-bg)' : 'var(--input-opposite-bg)'};
                border-bottom: 2px solid vaR(--bg);
            "
            id="entitybutton${entity.id}"
        >
            ${entity.name}
        </button>
        <div id="childrenOf${entity.id}" style="padding-left: 20px">
            ${entity.transform.children
                .map(child => _entity_(child, Object.is(state.selectedEntity, child))
            ).join('')}
        </div>
    </div>
`;

const h = $('#hierarchy');
let scenes = $('#scene-select');
const addSceneButton = $('#add-scene');
const renameSceneButton = $('#rename-scene');
const renameSceneTo = $('#rename-scene-to');

export function reRenderHierarchy () {

    h.html(`
        <p class="header">
            <button id="add-scene" style="font-size: 20px">+</button>
            <select id="scene-select" onchange="window.setScene()" style="font-size: 20px" class="text-box">
            </select><br>
            <button id="rename-scene">
                rename to
            </button>
            <input 
                type="text" 
                id="rename-scene-to" 
                style="
                    border-radius: 0;
                    border-bottom: 1px solid vaR(--text-colour); 
                    background: none
            ">
        </p>
    `);

    // add the drop-down menu to the html
    for (let scene of Scene.scenes) {
        let isActive = scene.id === Scene.active;

        scenes.append(`
            <option value="${scene.id}" ${isActive? 'selected': ''}>
                ${scene.name}
            </option>
        `);
    }

    addSceneButton.click(() => {
        let ctx = Scene.activeScene.settings.ctx;
        Scene.active = Scene.create({
            name: 'New Scene'
        }).id;
        // remember the context to that it can be immediately rendered without a reload of the settings
        Scene.activeScene.settings.ctx = ctx;
        reRender();
        window.save();
    });

    renameSceneButton.click(() => {
        let val = renameSceneTo.val();
        if (!val) {
            return;
        }
        if (typeof val !== 'string') {
            return;
        }

        Scene.activeScene.name = val;
        window.save();
        reRender();
    });

    let entities = '';
    let sceneEntities = Scene.activeScene.entities;

    // draw the entities in the entity tree
    for (let entity of sceneEntities){

        if (!entity.transform.isRoot()){
            continue;
        }

        // so that only root nodes have <li>s around, children are just in divs
        entities += `
            <li>
                ${_entity_(entity, Object.is(state.selectedEntity, entity))}
            </li>
        `;
    }

    // add the right-clickable area
    h.append(`
        <ul id="hierarchy-draggable-area">
            ${entities}
        </ul>
        <div id="create-entity-area" style="height: 100%; max-height: 100vw"></div>
    `);

    // add the right click menu to each sprite in the DOM
    for (let i = 0; i < sceneEntities.length; i++) {
        const entity = sceneEntities[i];

        // make the sprite select when clicked
        $(`#entitybutton${entity.id}`).click(() => {
            // stop a new spite being selected when the menu is up and an option is clicked
            if ($('#pop-up').css('visibility') === 'visible')
                return;

            setSelected(entity);
            reRender();
        });

        setRightClick(`entitybutton${entity.id}`, entity, `
            ${rightClickOption('delete', () => {
                state.selectedEntity?.delete();
                for (let child of state.selectedEntity?.transform.children || []) {
                    child.delete();
                }
                reRender();
            })}
            ${rightClickOption('duplicate', async () => {
                let clone = await state.selectedEntity?.getClone();
                if (!clone) {
                    return;
                }
    
                // entity (1) ==> entity (2)
                const regex = /(.*)\(([0-9]+)\)/;
                const match = clone.name.match(regex);
                if (match) {
                    const num = parseInt(match[2]) + 1;
                    clone.name = `${match[1]} (${num})`;
                }
                else
                    clone.name = `${clone.name} (1)`;
    
                Entity.entities.push(clone);
                reRender();
            })}
            ${rightClickOption('add child', async () => {
                Entity.newEntity({
                    name: 'New Entity',
                    transform: new Transform({
                        parent: state.selectedEntity?.transform || Scene.active
                    }),
                });
                reRender();
            })}
        `);
    }

    // make it deselect all sprites when the right-clickable area is clicked
    $(`#create-entity-area`).click(() => {
        setSelected(null);
        reRender();
    });

    setRightClickAddEntityMenu('create-entity-area');
}