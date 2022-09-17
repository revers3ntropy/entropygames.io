import * as core from './main.js';

/**
 * @param {string} message - is parsed as HTML
 */
export async function showError(message) {
    await waitForReady();

    if (!state.$error) {
        state.$error = document.createElement('div');
        state.$error.id = 'error-container';
        document.body.appendChild(state.$error);
    }

    let myErrId = state.currentNotificationId++;

    while (state.visibleNotifications.length > core.MAX_NOTIFICATIONS) {
        let id = state.visibleNotifications.shift();
        document.getElementById(`error-${id}`).remove();
    }

    let errorMessage = document.createElement('div');
    errorMessage.innerHTML = `
        ${message}
        <span
        	onclick="this.parentElement.remove()"
        	style="font-size: 18px"
        >&times;</span>
    `;
    errorMessage.classList.add('error');
    errorMessage.id = `error-${myErrId}`;
    state.$error.appendChild(errorMessage);
    state.visibleNotifications.push(myErrId);

    setTimeout(() => {
        errorMessage.remove();
        state.visibleNotifications = state.visibleNotifications.filter(
            id => id !== myErrId
        );
    }, core.NOTIFICATION_SHOW_TIME);
}

/**
 * Shows an error from a code (a string)
 * @param {string} code
 * @returns {Promise<void>}
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
    reservoir.reload($footer);
    updateTheme();
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

    reservoir.reload($nav);
    updateTheme();
}

export async function domIsLoaded() {
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

/**
 * Sets the data-theme attribute of the document body from the value stored in localStorage or the theme preference
 */
export function updateTheme($el=document) {
    const theme =
        getTheme() ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.setAttribute('data-theme', theme);

    $el.querySelectorAll('*').forEach(el => {
        if (theme === 'dark') {
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