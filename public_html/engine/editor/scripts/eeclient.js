import {state} from "./state";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const projectID = urlParams.get('p');

/**
 * API call to localhost server
 * @param {string} path
 * @param body
 * @param {(value: Response) => (Response | PromiseLike<Response> | void)} success
 * @param {(reason: any) => PromiseLike<void>} error
 */
function localhost (
	path: string,
	body: any,
	success: (value: Response) => Response | PromiseLike<Response | void> | void,
	error: (reason: any) => PromiseLike<void>
) {
	try {
		fetch('http://localhost:5501/'+path, {
			body: JSON.stringify(body),
			method: 'POST'
		})
			.then(success)
			.catch(error);
	} catch (e) {
		error(e);
	}
}

async function check () {
	localhost('ping', {}, async response => {
		if (state.running) {
			return;
		}
		const res = await response.text();
		if (res !== '1') {
			setTimeout(check, 1000);
			return;
		}

		authenticateServer();
	}, async () => void setTimeout(check, 1000)
	);
}

check();

function authenticateServer () {
	localhost('authenticate-connection', {
		user: localStorage.id,
		project: projectID
	}, async response => {
		const res = await response.text();
		if (res !== '1') {
			setTimeout(check, 500);
			return;
		}
		console.log('Connected to localhost client');
		waitForChanges();
	}, async () => void setTimeout(check, 500));
}

function waitForChanges () {
	localhost('changed', {}, async response => {
		if (state.running) return;
		const res = await response.text();
		if (res !== '1') {
			setTimeout(waitForChanges, 500);
			return;
		}
		window.location.reload();

	}, async () => void setTimeout(check, 500));
}