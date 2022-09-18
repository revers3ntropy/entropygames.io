import {scripts, state} from "../state";
import {reRender} from "../renderer";
import {reloadScriptsOnEntities} from "../scripts";

import {_componentProperty_} from "./property";
import {_component_} from "./component";

// importing all components
import {
    Component,
    Script,
    CircleCollider, RectCollider,
    Body,
    CircleRenderer, ImageRenderer2D, RectRenderer,
    GUIBox, GUICircle, GUIImage, GUIPolygon, GUIRect, GUIText, GUITextBox,
    Camera
} from 'entropy-engine';

Script;


const allComponents: {[k: string]: (new (...args: any[]) => Component)[]} = {
    'General': [
        Camera
    ],
    'Physics': [
        Body,
        CircleCollider, RectCollider,
    ],
    'GUI': [
        GUIBox,
        GUIText,
        GUITextBox,
        GUIRect,
        GUICircle,
        GUIPolygon,
        GUIImage,
    ],
    'Renderers': [
        CircleRenderer, RectRenderer, ImageRenderer2D,
    ],
    'Scripts': [],
};

export function reRenderInspector () {

    // div that everything is put into
    const i = $('#inspector');

    if (!state.selectedEntity) {
        i.html(`

        <p style="text-align: center">
            No sprite selected
        </p>
        
        `);
        return;
    }

    i.html(`
        <div class="center" style="margin-bottom: 5px">
        <!--  do the name completely seperately -->
            <input
                type="text" 
                id="input-name" 
                value="${state.selectedEntity.name}" 
                onchange="window.onPropertyChange('input-name', 'nocomponent', ['name'])" 
                style="
                    font-size: 20px;
                    text-align: center;
                    padding: 8px 2px;
                "
            >
        </div>
    `);

    for (let p in state.selectedEntity) {
        if (!state.selectedEntity.hasOwnProperty(p)) continue;
        if (!['tag', 'Static'].includes(p)) continue;

        i.append(_componentProperty_(state.selectedEntity, p, 'nocomponent'));
    }

    for (let c of [state.selectedEntity.transform, ...state.selectedEntity.components])
        _component_(c, i);

    i.append(`
        <div id="add-component-wrapper">
            <div class="center">           
                <button id="add-component" class="button">
                    New Component
                </button>
            </div>
        </div>
    `);

    // add component button functionality
    $('#add-component').click(() => {

        if ($('.add-component-popup').length) return;

        window.addComponent = (type: string) => {
            try {
                state.selectedEntity?.addComponent(new (eval(type))({}));
            } catch(e) {
                // scripts
                const component = new Script({
                    path: type
                });

                if (!state.selectedEntity?.addComponent(component)) {
                    return;
                }

                component.name = type;

                reloadScriptsOnEntities()
                    .then(async () => {
                        await window.backgroundSave();
                        window.location.reload();
                    });
            }
            
            reRender();
        };

        const _button_ = (text: string) => (`
            <div>
                <button class='empty-button' onclick="window.addComponent(\`${text}\`)">
                    ${text}
                </button>
            </div>
        `);

        function components() {
            let html = '';
            for (let group in allComponents) {
                html += `
                    <button
                        class="empty-button" 
                        style="background-color: vaR(--input-opposite-bg)"
                    >
                       ${group}
                    </button>
                `;

                if (group === 'Scripts') {
                    for (let name in scripts)
                        html += _button_(`${name}`);
                    continue;
                }

                for (let name of allComponents[group]) {
                    let instance = new (name)({});
                    html += _button_(instance.constructor.name);
                }
            }

            return html;
        }

        setTimeout(() => {
            // timeout to make sure it actually appears, as it is first removed
            $('#add-component-wrapper').append(`
            <div style="width: 100%; display: flex; justify-content: center">
                <div class="add-component-popup">
                    ${components()}
                </div>
            </div>

            `);
            // show the whole add component menu
            let objDiv = document.getElementById("inspector");
            if (!objDiv) throw 'expected inspector';
            objDiv.scrollTop = objDiv.scrollHeight;
        }, 5);

    });
}