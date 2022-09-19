import * as core from './main.js';
import { ROOT_PATH } from "./main.js";

/**
 * @param {string} message is parsed as HTML
 * @param {string?} className
 */
export function showMessage(message, className = '') {
    waitForReady().then(() => {
        console.error(message);
        if (!state.$error) {
            state.$error = document.createElement('div');
            state.$error.classList.add('message-container');
            document.body.appendChild(state.$error);
        }

        let myErrId = state.currentNotificationId++;

        while (state.visibleNotifications.length > core.MAX_NOTIFICATIONS) {
            let id = state.visibleNotifications.shift();
            document.getElementById(`message-${id}`).remove();
        }

        let errorMessage = document.createElement('div');
        errorMessage.innerHTML = `
            ${message}
            <i
                onclick="this.parentElement.remove()"
                style="font-size: 18px; cursor: pointer;"
                class="close icon"
            ></i>
        `;

        const classes = className.split(' ').filter(Boolean);
        errorMessage.classList.add('message', ...classes);
        errorMessage.id = `message-${myErrId}`;
        state.$error.appendChild(errorMessage);
        state.visibleNotifications.push(myErrId);

        setTimeout(() => {
            errorMessage.remove();
            state.visibleNotifications = state.visibleNotifications.filter(
                id => id !== myErrId
            );
        }, core.NOTIFICATION_SHOW_TIME);
    });
}

export function showError(message) {
    showMessage(message, 'error');
}

/**
 * Shows an error from a code (a string)
 * @param {string} code
 * @returns {void}
 */
export function showErrorFromCode(code) {
    return showError(
        {
            auth: 'You need to log in',
            'api-con': 'Lost connection to server',
            cookies: 'You have not accepted cookies',
        }[code] || 'An Unknown Error has Occurred'
    );
}

/**
 * Returns a promise which resolves once the document has been loaded
 * AND all necessary assets have been loaded from this script
 * @returns {Promise<void>}
 */
export async function waitForReady() {
    return await new Promise(resolve => {
        if (state.documentLoaded) {
            resolve();
            return;
        }
        state.onLoadCBs.push((...args) => resolve(...args));
    });
}

/**
 * Loads the footer into the <footer> element
 * @returns {Promise<void>}
 */
export async function loadFooter($footer) {
    if (!$footer) return;
    const footerHTMLRes = await fetch(
        `${core.ROOT_PATH}/assets/html/footer.html`
    );
    state.$footer.innerHTML = await footerHTMLRes.text();

    R.reload($footer);
}

/**
 * Loads the navbar into the <nav> element
 * and updates it with the current user's info
 * @returns {Promise<void>}
 */
export async function loadNav($nav) {
    if (!$nav) return;

    const navRes = await fetch(`${core.ROOT_PATH}/assets/html/nav.html`);
    $nav.innerHTML = await navRes.text();

    R.reload($nav);
}

export async function domIsLoaded() {

    // before rest so less specific than my styles
    document.head.innerHTML = `
            <link rel="stylesheet" href="${ROOT_PATH}/assets/lib/semantic/semantic.min.css" media="print" onload="this.media='all'">
    ` + document.head.innerHTML;

    R.hook('preHydrate', $el => {
        if (theme() === 'dark') {
            $el?.classList?.add('inverted');
        } else {
            $el?.classList?.remove('inverted');
        }
    });

    updateTheme();

    state.documentLoaded = true;

    for (const cb of state.onLoadCBs) {
        cb();
    }
}

/**
 * Scrolls the viewport to the top of the page
 */
export function scrollToTop() {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
}

export function theme () {
    return getTheme() ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
/**
 * Sets the data-theme attribute of the document body from the value stored in localStorage or the theme preference
 */
export function updateTheme() {

    document.body.setAttribute('data-theme', theme());

    document.querySelectorAll('*').forEach(el => {
        if (theme() === 'dark') {
            el.classList.add('inverted');
        } else {
            el.classList.remove('inverted');
        }
    });
}

/**
 * Sets the localStorage theme value and then updates the theme
 * @param {string} value
 */
export function setTheme(value = 'dark') {
    localStorage.setItem(core.LS_THEME, value);
    updateTheme();
}
/**
 * Gets the localStorage theme value
 */
export function getTheme() {
    return localStorage.getItem(core.LS_THEME) ?? 'dark';
}