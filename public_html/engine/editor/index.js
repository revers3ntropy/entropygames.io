import "./scripts/builder";
import './scripts/events';
import {loadScripts, reloadScriptsOnEntities} from "./scripts/scripts";
import './scripts/state';
import {state, scripts, projectID, setSelected} from './scripts/state';

import './scripts/updatePing';
import './scripts/eeclient';

import * as ee from "entropy-engine";

// cache busting
const scriptFetchHeaders = new Headers();
scriptFetchHeaders.append('pragma', 'no-cache');
scriptFetchHeaders.append('cache-control', 'no-cache');

const scriptFetchInit = {
    method: 'GET',
    headers: scriptFetchHeaders,
};

// new nav bar, remove old one
$('nav').html('');

async function initFromFiles (id: number) {
    const path = `../projects/${id}`;
    const config: {[k: string]: any} = {};

    // get and init the
    const data_ = await fetch(path + `/index.json?c=${window.genCacheBust()}`, scriptFetchInit);
    const data = await data_.json();

    for (let key in data) {
        if (['sprites', 'scenes'].includes(key)) {
            continue;
        }

        config[key] = data[key];
    }

    ee.initialiseScenes(data['scenes'] || []);

    state.sceneCamera = new ee.Entity({
        components: [
            new ee.Camera({})
        ]
    });

    state.eeReturns = ee.EntropyEngine(config);

    await ee.entitiesFromJSON(data['entities'] || []);

    setSelected(ee.Entity.entities[0]);

    await reloadScriptsOnEntities();

    ee.Camera.main = state.sceneCamera;
    ee.Scene.active = parseInt(sessionStorage.sceneID) || 0;
}

async function checkCredentials (): Promise<number> {
    return new Promise(resolve => {
        window.mustBeSignedIn(async () => {
            const accessLevel = (await window.request('get-project-access', window.apiToken))['accessLevel'];

            if (accessLevel < 1) {
                window.location.href = 'https://entropyengine.dev/accounts/error?type=projectAccessDenied';
                return;
            }

            console.log(`ACCESS LEVEL: ${accessLevel}`);

            if (!accessLevel) {
                return;
            }

            resolve(accessLevel);
        });
    })
}

async function main () {
    const accessLevel = await checkCredentials();
    if (accessLevel < 1) {
        throw 'no access to project';
    }
    await ee.initialiseEntropyScript();
    await loadScripts();
    state.currentScript ??= Object.keys(scripts)[0];

    if (!projectID) {
        throw 'Invalid projectID';
    }

    await initFromFiles(parseInt(projectID));

    const data = await window.request('get-project-name', window.apiToken);

    const name = ee.cullString(data.name, 16);
    $(`#project-name`).html(name);
    document.title = name;
}

main();

