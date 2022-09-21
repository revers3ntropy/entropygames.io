'use strict';
import * as core from './main.js';
import { api } from './backendAPI.js';
import { LS_SESSION, showErrorFromCode } from './main.js';
import { ConfirmPopup } from '../components/confirm-popup.js';

/**
 * Caches the user info
 * @param info
 * @returns {Promise<void>}
 */
export async function handleUserInfo(info) {
    state.isSignedIn = info?.ok;

    if (!state.isSignedIn) {
        info = null;
    }
    state.userInfoJSON = info;
    state.userInfoIsLoaded = true;

    for (const cb of state.userInfoCallbacks) {
        cb(info);
    }

    state.userInfoCallbacks = [];
}

// user auth cookie utilities
export function getSession() {
    return localStorage.getItem(LS_SESSION);
}

export async function setSession(id) {
    return localStorage.setItem(core.LS_SESSION, id);
}

/**
 * Gets the user info from the session stored in the session cookie
 * @returns {Promise<unknown>}
 */
export async function userInfo() {
    if (state.userInfoIsLoaded) {
        return state.userInfoJSON;
    }
    return new Promise(resolve => {
        state.userInfoCallbacks.push(resolve);
    });
}

/**
 * Gets the user Id from the session stored in the session cookie
 * @returns {Promise<string>}
 */
export async function userId() {
    const user = await userInfo();
    if (!user['id']) {
        throw 'no user Id found';
    }
    return user['id'];
}

/**
 * @returns {Promise<boolean>}
 */
export async function isAdmin() {
    return (await userInfo())['admin'];
}

/**
 * Runs the callback when it is confirmed that the user is an admin
 * @param {() => any} cb
 */
export function asAdmin(cb) {
    isAdmin().then(value => {
        if (value) {
            cb();
        }
    });
}

/**
 * Returns true if the session stored in the cookie is valid
 * @returns {Promise<boolean>}
 */
export async function signedIn() {
    if (state.userInfoIsLoaded) {
        return state.isSignedIn;
    }
    return new Promise(resolve => {
        state.userInfoCallbacks.push(() => {
            resolve(state.isSignedIn);
        });
    });
}

/**
 * Prompts the user with 'confirm' and then
 * removes all authentication cookies and
 * redirects to the login page
 * @returns {Promise<void>}
 */
export async function logout() {
    ConfirmPopup({
        title: 'Sign Out',
        message: 'Are you sure you want to sign out?',
        $el: document.body.appendChild(document.createElement('div')),
        then: (res) => {
            if (res) {
                logoutAction();
            }
        }
    });
}

/**
 * Deletes all authentication cookies and
 * redirects to the login page
 * @returns {Promise<void>}
 */
export async function logoutAction() {
    await localStorage.removeItem(core.LS_SESSION);
    R.set({
        'user': null,
        'signedIn': false
    },true);
    await core.navigate('/');
}

/**
 * Pings the server and if the ping fails
 * navigates the user to the login page
 * which will show that this error
 * @returns {Promise<void>}
 */
export async function testApiCon() {
    const res = await api(`get/server/ping`).catch(err => {
        console.error(err);
        if (core.GETParam('error') !== 'api-con') {
            core.navigate('/?error=api-con');
        }
    });

    if (!res.ok || res.status !== 200) {
        console.error(res);
        if (core.GETParam('error') !== 'api-con') {
            await showErrorFromCode('api-con');
        }
    }
}

/**
 * Tries to sign you in as the user with the given Id.
 * @param {string} id
 * @param {string} username
 * @returns {Promise<void>}
 */
export async function signInAs(id, username) {
    if (!(await isAdmin())) {
        return;
    }

    if (!confirm(`Sign in as ${username}?`)) {
        return;
    }

    const { sessionId } = await api(`create/sessions/from-user-id`, {
        userId: id,
    });

    if (!sessionId) {
        return;
    }

    await setSession(sessionId);
    await core.navigate(`/user/?@=${username}`);
}