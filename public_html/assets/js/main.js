'use strict';
// Utility script imported by all pages

// Global constants and variables
export const
    COOKIE_SESSION = 'hpnea_SessionId',
    COOKIE_ALLOW_COOKIES_KEY = 'hpnea_AllowedCookies',
    LS_THEME = 'hpnea_Theme',
    LS_RESERVOIR = 'hpnea_Reservoir',
    HOUSE_NAME = 'Osmond',
    svgCache = {},
    SPINNER_STOP_DELAY = 300,
    MAX_NOTIFICATIONS = 4,
    NOTIFICATION_SHOW_TIME = 5000;

// should be const but is set once at the start of the script
export let
    ROOT_PATH = '',
    API_ROOT = 'https://josephcoppin.com/school/house-points/api';

export const state = {
    $nav: null,
    $footer: null,
    $error: null,
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
    spinnerFrameId: 0,
    popupStack: [],
};

reservoir.localStorageKey = LS_RESERVOIR;

// polluting the global namespace
window.logout = logout;
window.signInAs = signInAs;
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

import './components/index.js';
import {
    domIsLoaded,
    loadFooter,
    loadNav, loadSettings,
    reloadDOM,
    scrollToTop,
    showError,
    waitForReady
} from "./dom.js";
import { getSession, handleUserInfo, testApiCon, userInfo, signInAs, logout } from './auth.js';
import { rawAPI } from './backendAPI.js';
import { cookiePopUp } from './cookies.js';
import reservoir from './hydration.js';

export * from './auth.js';
export * from './backendAPI.js';
export * from './cookies.js';
export * from './dom.js';
export * from './svg.js';
export * from './popups.js';
export { reservoir };

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
export async function init(
    rootPath,
    requireLoggedIn = false,
    requireAdmin = false,
    noApiTest = false
) {
    const start = performance.now();

    ROOT_PATH = rootPath;
    //API_ROOT = `${rootPath}/api`;

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
    
    const backsToRoot = (rootPath.match(/\.\./g) || []).length;
    const path = location.pathname;
    const pathFromRoot = '/' +  path.split('/').slice(-backsToRoot-1, -1).join('/');
    
    // after made sure that the user has the right permissions,
    // load the rest of the page
    reservoir.loadFromLocalStorage(false);
    reservoir.set(
        {
            houseName: HOUSE_NAME,
            rootPath,
            user: state.userInfoJSON,
            signedIn: state.isSignedIn,
            path: pathFromRoot,
            url: location.href
        },
        true
    );

    await waitForReady();

    // load footer and nav bar
    state.$nav = document.querySelector(`nav`);
    state.$footer = document.querySelector(`footer`);

    if (state.$nav) {
        await loadNav();
    }
    if (state.$footer) {
        await loadFooter();
    }
    
    loadSettings();

    cookiePopUp();

    reloadDOM();

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
