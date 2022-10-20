'use strict';
// Utility script imported by all pages
import '../../cdn/node_modules/entropy-hydrate/index.js';
import '../../assets/lib/jquery/index.js';

// Global constants and variables
export const
    LS_THEME = 'theme',
    LS_SESSION = 'session',
    SS_GITHUB_AUTH_STATE = 'github-oauth-state-temp',
    GITHUB_AUTH_CLIENT_ID = '5e0bcd5bc1ba2bd2f4f4',
    SPINNER_STOP_DELAY = 300,
    MAX_NOTIFICATIONS = 4,
    NOTIFICATION_SHOW_TIME = 5000,
    ENVIRONMENTS = {
        'localhost': 'dev',
        '127.0.0.1': 'dev',
        'entropygames.io': 'prod',
        'engine.entropygames.io': 'prod',
        'cdn.entropygames.io': 'prod',
        'api.entropygames.io': 'prod',
        'staging.entropygames.io': 'staging'
    },
    API_ROUTES = {
        'test': 'http://localhost:9081',
        'dev': 'http://localhost:9080/',
        'staging': 'https://api-staging.entropygames.io/?',
        'prod': 'https://api.entropygames.io/?'
    },
    SITE_ROOTS = {
        'test': 'http://localhost:8000',
        'dev': 'http://localhost:8000',
        'staging': 'https://staging.entropygames.io',
        'prod': 'https://entropygames.io'
    };

// should be const but is set once at the start of the script
export let
    ENV = ENVIRONMENTS[new URL(window.location.href).hostname] || 'test',
    API_ROOT = API_ROUTES[ENV],
    ROOT_PATH = SITE_ROOTS[ENV];

export const state = {
    $nav: null,
    $footer: null,
    $error: null,
    $main: null,
    currentNotificationId: 0,
    visibleNotifications: [],
    userInfoCallbacks: [],
    userInfoJSON: null,
    isSignedIn: false,
    userInfoIsLoaded: false,
    onLoadCBs: [],
    documentLoaded: false,
    inlineComponentIndex: 0,
    spinnerQueue: [],
    spinnerFrameId: 0
};

// polluting the global namespace
window.logout = logout;
window.state = state;

// for making relative dates
/** @type {{[ k: 'month'|'hour'|'year'|'day'|'minute'|'second' ]: number}} */
const timeUnits = {
    year: 24 * 60 * 60 * 1000 * 365,
    month: (24 * 60 * 60 * 1000 * 365) / 12,
    day: 24 * 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    minute: 60 * 1000,
    second: 1000,
};

// for making relative dates
const relativeTimeFormat = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
});

import {
    domIsLoaded,
    loadFooter,
    loadNav,
    scrollToTop, setTheme,
    showError,
    waitForReady
} from "./dom.js";
import { getSession, handleUserInfo, testApiCon, userInfo, logout } from './auth.js';
import { rawAPI } from './backendAPI.js';
import '../components/index.js';

export * from './auth.js';
export * from './backendAPI.js';
export * from './dom.js';

(async () => {
    // main function - don't put top-level code anywhere else
    if (document.readyState === 'complete') {
        await domIsLoaded();
    } else {
        window.onload = domIsLoaded;
    }
})();

/**
 * Must be called first
 * @param {string} rootPath path to root of site
 * @param {boolean} [requireLoggedIn=false] session cookies must be valid
 * @param {boolean} [requireAdmin=false] session cookies must be valid and admin
 * @param {boolean} [noApiTest=false] don't test the API connection
 */
export async function init({
    rootPath,
    requireLoggedIn = false,
    requireAdmin = false,
    noApiTest = false
}={}) {
    const start = performance.now();

    ENV = ENVIRONMENTS[new URL(window.location.href).hostname] || 'test';
    API_ROOT = API_ROUTES[ENV];
    ROOT_PATH = rootPath || SITE_ROOTS[ENV];

    if (!noApiTest) {
        await testApiCon();
    }

    if (getSession()) {
        await handleUserInfo(
            await rawAPI(`get/users`, {
                sessionId: getSession(),
            })
        );
    } else {
        await handleUserInfo(null);
    }

    const user = await userInfo();
    if (requireLoggedIn && (!user || !user['id'])) {
        console.error(`Required signed in, got user:`, user);
        console.log(`Session Token: `, getSession());
        await navigate(`/?error=auth&cb=${encodeURIComponent(location.href)}`);
        return;
    }
    if (requireAdmin && !user.admin) {
        console.error(`Required admin, got user: ${user}`);
        console.log(`Session Token: `, getSession());
        await navigate(`/?error=auth&cb=${encodeURIComponent(location.href)}`);
        return;
    }

    // after made sure that the user has the right permissions,
    // load the rest of the page
    hydrate.loadFromLocalStorage(false);
    hydrate.set({
        rootPath: ROOT_PATH,
        user: state.userInfoJSON,
        signedIn: state.isSignedIn,
        userInfoIsLoaded: true,
        path: location.pathname,
        url: location.href,
        theme: localStorage.getItem(LS_THEME),
        setTheme: (val) => {
            setTheme(val);
            hydrate.set({ theme: val });
        }
    }, true);

    await waitForReady();

    // load footer and nav bar
    state.$nav = document.querySelector(`nav`);
    state.$footer = document.querySelector(`footer`);
    state.$main = document.querySelector(`main`);

    await loadNav(state.$nav);
    await loadFooter(state.$footer);

    scrollToTop();

    const time = performance.now() - start;
    console.log(`Initialised page in ${time.toPrecision(3)}ms`);
}

/**
 * Gets the difference in the timestamps as a human-readable string, like '2 days' (ago)
 * Timestamps are in milliseconds.
 * @param {number} d1
 * @param {number?} [d2=Date.now()]
 * @returns {string}
 */
export function getRelativeTime(d1, d2) {
    if (isNaN(d1)) {
        console.error(`getRelativeTime: d1 '${d1}' is not a number`);
        return 'In the Past';
    }
    const now = Date.now();
    d2 ||= now;
    const elapsed = d1 - d2;
    
    if (elapsed > 1000*60*60*24*3 && d2 === now) {
        const date = new Date(d1);
        return `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
    }

    // "Math.abs" accounts for both "past" & "future" scenarios
    for (const u in timeUnits) {
        if (Math.abs(elapsed) > timeUnits[u] || u === 'second') {
            return relativeTimeFormat.format(Math.round(elapsed / timeUnits[u]), u);
        }
    }
}

/**
 * Gets a decoded GET parameter from the URL of the page
 * @param {string} name
 * @returns {string|null}
 */
export function GETParam(name) {
    let temp = GETParamRaw(name);
    if (temp !== null) {
        temp = decodeURIComponent(temp);
    }
    return temp;
}

/**
 * Gets a GET parameter from the URL of the page
 * Un-decoded, raw from URL
 * @param {string} name
 * @returns {string|null}
 */
export function GETParamRaw(name) {
    let result = null;

    location.search
        .substring(1)
        .split('&')
        .forEach(function (item) {
            let tmp = item.split('=');
            if (tmp[0] === name) {
                result = tmp[1];
            }
        });

    return result;
}

/**
 * Navigates to a webpage
 * @param {string} url
 * @returns {Promise<never>}
 */
export const navigate = async url => {
    await waitForReady();
    
    if (url[0] === '/') {
        url = ROOT_PATH + url;
    }

    console.log('NAVIGATING TO', url);
    window.location.assign(url);
    // never resolve promise as just wait for the page to load
    return await new Promise(() => {});
};

/**
 * Returns a promise which resolves after a set amount of time
 * @param {number} ms
 * @returns {Promise<void>}
 */
export async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Limits the length of a string by cutting it and adding '...'
 * to the end if it's too long
 * @param {string} str
 * @param {number} [maxLength=50]
 * @returns {string}
 */
export function limitStrLength(str, maxLength = 50) {
    if (str.length > maxLength - 3) {
        return str.substring(0, maxLength - 3) + '...';
    }
    return str;
}

/**
 * Gets the contents of the file as a string
 * @param {string|HTMLInputElement} $el
 * @param {string} encoding
 * @returns {Promise<string>}
 */
export async function getFileContent($el, encoding = 'UTF-8') {
    if (typeof $el === 'string') {
        $el = document.querySelector($el);
    }

    // assumed to be file input element
    const file = $el.files[0];

    if (!file) return '';

    const reader = new FileReader();
    reader.readAsText(file, encoding);

    return await new Promise((resolve, reject) => {
        reader.onload = evt => {
            resolve(evt.target.result);
        };
        reader.onerror = async () => {
            await showError('Error reading file, please try again');
            reject('Error reading file');
        };
    });
}

/**
 * ref: http://stackoverflow.com/a/1293163/2343
 * This will parse a delimited string into an array of arrays.
 * The default delimiter is the comma, but this can be overriden
 * with the second argument.
 * @param {string} strData
 * @param {string} [strDelimiter=undefined]
 * @returns {*[][]}
 */
export function CSVToArray(strData, strDelimiter) {
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter ||= ',';

    // Create a regular expression to parse the CSV values.
    const objPattern = new RegExp(
        // Delimiters.
        '(\\' +
            strDelimiter +
            '|\\r?\\n|\\r|^)' +
            // Quoted fields.
            '(?:"([^"]*(?:""[^"]*)*)"|' +
            // Standard fields.
            '([^"\\' +
            strDelimiter +
            '\\r\\n]*))',
        'gi'
    );

    // Create an array to hold our data. Give the array
    // a default empty first row.
    let arrData = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    let arrMatches;

    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while ((arrMatches = objPattern.exec(strData))) {
        // Get the delimiter that was found.
        let strMatchedDelimiter = arrMatches[1];

        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push([]);
        }

        let strMatchedValue;

        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[2]) {
            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
        } else {
            // We found a non-quoted value.
            strMatchedValue = arrMatches[3];
        }

        // Now that we have our value string, let's add
        // it to the data array.
        arrData[arrData.length - 1].push(strMatchedValue);
    }

    // Return the parsed data.
    return arrData;
}

/**
 * Creates a random string
 * Note: this is not cryptographically secure
 * @param {number} len
 * @param {string} charset
 * @returns {string}
 */
export function genRandomString(
    len = 10,
    charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
) {
    let text = '';
    for (let _ = 0; _ < len; _++) {
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return text;
}

/**
 * Format a UNIX timestamp to the date format expected by a <input type="date"> element
 * @param {number} seconds
 * @returns {string}
 */
export function formatTimeStampForInput(seconds) {
    const date = new Date(seconds * 1000);
    return (
        `${date.getFullYear()}-` +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        '-' +
        ('0' + date.getDate()).slice(-2)
    );
}

/**
 * Gets the current time in the format expected by a <input type="datetime-local"> element
 * @returns {string}
 */
formatTimeStampForInput.prototype.now = () => {
    return formatTimeStampForInput(Date.now() / 1000);
}

/**
 * Returns the string in HTML escaped form to prevent XSS attacks
 * and general horribleness
 * @param {*} unsafe
 * @returns {*}
 */
export function escapeHTML(unsafe) {
    return (unsafe ?? '')
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * @param {number} length
 * @returns {string}
 */
export function randomString(length = 10) {
    const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return text;
}

/**
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * @param {string} name
 * @returns {string}
 */
export function getURLParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}