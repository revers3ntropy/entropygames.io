import { escapeHTML } from '../js/main.js';
import { hidePopup } from "./popup.js";

export const ConfirmPopup = reservoir.Component('confirm-popup', ({
    message,
    allowHTML = false,
    title,
    then = () => {},
    id
}) => {
    if (!allowHTML) {
        message = escapeHTML(message);
        title = escapeHTML(title);
    }

    R.set({
        [`ConfirmPopup${id}_then`]: (value, id) => {
            hidePopup(id);
            then(value);
        }
    });

    return `
        <pop-up>
            <h2>${title}</h2>
            <p>${message}</p>
            <button
                class='ui labeled icon button'
                bind.click='ConfirmPopup${id}_then(false, popupid)'
            >
                <i class='ui cross icon'></i>
                Cancel
            </button>
            <button
                class='ui labeled icon button primary'
                bind.click='ConfirmPopup${id}_then(true, popupid)'
            >
                <i class='ui check icon'></i>
                Ok
            </button>
        </pop-up>
    `;
})