import * as core from './main.js';
import CookieCard from './components/CookieCard.js';

// Cookie Utilities

// src: https://stackoverflow.com/questions/14573223/set-cookie-and-get-cookie-with-javascript
/**
 * Sets a cookie from a key and value.
 * First checks that the user has allowed cookies, and will navigate away if they haven't.
 * @param {string} name
 * @param {string} value
 * @param {number} [days=1]
 */
export async function setCookie(name, value, days = 1) {
    if (!cookiesAllowed() && name !== core.COOKIE_ALLOW_COOKIES_KEY) {
        await core.showError('You must allow cookies to use this site.');
        return new Error('Cookies not allowed');
    }

    let expires = '';
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + value + expires + '; path=/';
}

/**
 * Gets a cookie from a key.
 * @param {string} name
 * @returns {string|null}
 */
export function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

/**
 * Deletes a cookie with a given key.
 * First checks that the user has allowed cookies, and will navigate away if they haven't.
 * @param {string} name
 */
export async function eraseCookie(name) {
    if (!cookiesAllowed()) {
        await core.showError('You must allow cookies to use this site.');
        return new Error('Cookies not allowed');
    }

    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

/**
 * Checks if the user has allowed cookies
 * and if not then shows a popup to get them to allow them
 */
export function cookiePopUp() {
    if (cookiesAllowed()) {
        return;
    }

    const $cookiePopUp = document.createElement('div');
    $cookiePopUp.id = 'cookie-popup';
    CookieCard($cookiePopUp);
    document.body.appendChild($cookiePopUp);
}

export function cookiesAllowed() {
    return getCookie(core.COOKIE_ALLOW_COOKIES_KEY) === '1';
}
