import {state, scripts} from '../state';
import {mapScripts} from "../scripts";

export const renderScripts = (divID: string) => {
    const s = $(`#${divID}`);

    s.html(`
        <div style="width: 100%; height: 100%;">
            <!-- all scripts -->
            <div id="scripts-container">
                ${mapScripts((name, script) => `
                    <button 
                        onclick="window.switchScripts('${name}')" 
                        style="
                            border: none;
                            outline: none;
                            padding: 4px;
                            background-color: ${name === state.currentScript ? 'var(--input-bg)':'var(--input-opposite-bg)'}
                        "
                        onMouseOver="this.style.backgroundColor='var(--input-hover-bg)'"
                        onMouseOut="this.style.backgroundColor='${name === state.currentScript ? 'var(--input-bg)':'var(--input-opposite-bg)'}'"
                    >
                        ${name}.es
                    </button>
                `).join('')}
                <!-- for the spacing -->
                <span class="even-space-stretch"></span>
            </div>
            <!-- new scripts -->
            <input type="text" id="new-script-name" style="margin-right: 0" placeholder="new script name">
            <button onclick="window.blankScript('new-script-name')" class="short-button">+</button>

            
            <div id="script-editor" style="height: calc(100vh - 190px);"></div>
        </div>
    `);

    if (Object.keys(scripts).length < 1) {
        return;
    }

    if (!state.currentScript) return;
    $('#script-editor').html(`
        <textarea id="script-code">${scripts[state.currentScript] ?? ''}</textarea>
    `);

    // save the new code locally
    $('#script-code').keyup(() => {
        const code = $('#script-code').val()?.toString();
        if (!code && code !== '') throw 'no code found...';
        scripts[state.currentScript] = code;
    });
};
