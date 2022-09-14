'use strict';
import { registerComponent } from '../dom.js';
import * as core from '../main.js';

/**
 * Makes a full page popup which can be closed by clicking on the background.
 *
 * @param {El} $el
 * @param {string} content
 * @param {string} title
 */
export default registerComponent('FullPagePopup', ($el, id, content, title = ' ') => {
    const $p = document.createElement('div');
    $p.classList.add('full-page-popup');
    $p.id = `full-page-popup-${id}`;

    $p.innerHTML = `
		<div class="popup-content">
			<div class="popup-header" style="display: ${title ? 'flex' : 'none'}">
				<div>
					<!-- left -->
					<button
						class="icon"
						svg="cross.svg"
						onclick="_FullPagePopup${id}__hide()"
					></button>
				</div>				
				<div>
					<h2 style="margin: 0; padding: 0" class="vertical-flex-center">
                        ${title}
                    </h2>
				</div>				
				<div>
					<!-- right -->
				</div>
			</div>
			${content}
		</div>
	`;

    // add to page
    $el.appendChild($p);
    core.reloadDOM($p);

    function hide() {
        $p.remove();
        core.state.popupStack.splice(core.state.popupStack.indexOf(id), 1);
        removeEventListener('keydown', keyDownListener);
    }

    window[`_FullPagePopup${id}__hide`] = hide;

    $p.addEventListener('click', evt => {
        // check that we clicked on the background not the popup content
        if (evt.target.classList.contains('full-page-popup')) {
            hide();
        }
    });

    function keyDownListener(evt) {
        if (evt.key === 'Escape') {
            if (core.state.popupStack[core.state.popupStack.length - 1] === id) {
                hide();
            }
        }
    }

    addEventListener('keydown', keyDownListener);

    core.state.popupStack.push(id);

    return hide;
});
