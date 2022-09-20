import { escapeHTML } from '../js/main.js';

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
        [`ConfirmPopup${id}_then`]: (value, self) => {
            console.log(value, self);
            self.parentElement.remove();
            then(value);
        }
    });

    return `
        <div style='margin: 0 auto'>
            <h2>${title}</h2>
            <p>${message}</p>
            <button 
                class='ui labeled icon button'
                bind.click='ConfirmPopup${id}_then(false, $el)'
            >
                <i class='ui cross icon'></i>
                Cancel
            </button>
            <button 
                class='ui labeled icon button primary' 
                bind.click='ConfirmPopup${id}_then(true, $el)'
            >
                <i class='ui check icon'></i>
                Ok
            </button>
        </div>
    `;
})