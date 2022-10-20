import { hidePopup } from "./popup.js";

export const ConfirmPopup = hydrate.Component('confirm-popup', ({
    message,
    title,
    then = () => {},
}) => {
    function clickCb (value, id) {
        hidePopup(id);
        then(value);
    }

    return hydrate.html`
        <pop-up>
            <h2>${title}</h2>
            <p>${message}</p>
            <button
                class='ui labeled icon button'
                @click='${clickCb}(false, popupid)'
            >
                <i class='ui cross icon'></i>
                Cancel
            </button>
            <button
                class='ui labeled icon button primary'
                @click='${clickCb}(true, popupid)'
            >
                <i class='ui check icon'></i>
                Ok
            </button>
        </pop-up>
    `;
})