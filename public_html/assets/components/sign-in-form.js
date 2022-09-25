import {
	api,
	GITHUB_AUTH_CLIENT_ID,
	navigate,
	randomInt,
	randomString, ROOT_PATH, setSession,
	showError,
	SS_GITHUB_AUTH_STATE
} from "../js/main.js";


/**
 * @param {boolean} create
 * @param {string} username
 * @param {string} password
 * @param {string?} cb
 * @returns {Promise<void>}
 */
async function submitAction (create, username, password, cb) {
	if (!username) {
		return showError('Please enter a username');
	}
	if (!password) {
		return showError('Please enter a password');
	}
	if (username.length < 3) {
		return showError('Username must be at least 3 characters long');
	}
	if (password.length < 5) {
		return showError('Password must be at least 5 characters long');
	}

	if (create) {
		const response = await api('create/users', {
			username,
			password,
		});
		if (response.error) return;
	}

	const logInRes = await api('create/sessions/from-login', {
		username,
		password
	});

	if (logInRes.error) return;
	if (!logInRes.sessionId) {
		return showError('Failed to log in');
	}

	await setSession(logInRes.sessionId);

	if (typeof cb !== 'string' || !cb) {
		cb = ROOT_PATH;
	}
	
	await navigate(cb);
}

export const SignInForm = reservoir.Component('sign-in-form', ({ id, cb }) => {

	const state = randomString(randomInt(15, 25));
	sessionStorage.setItem(SS_GITHUB_AUTH_STATE, state);
	// feels wrong to have an id hard coded, but I think this is right
	const clientID = GITHUB_AUTH_CLIENT_ID;
	const redirect = `https://entropygames.io/auth/github-sign-in-redirect`;



	R.set({
		[`SignInForm${id}_username`]: '',
		[`SignInForm${id}_password`]: '',
		[`SignInForm${id}_submit`]: async (create=false) => {
			const username = R.get(`SignInForm${id}_username`);
			const password = R.get(`SignInForm${id}_password`);
			await submitAction(create, username, password, cb);
		}
	});

	return `
		<div class="ui form">
			<h2>Sign in to entropygames.io</h2>
			<div class="field">
				<label>Username</label>
				<input 
					@="SignInForm${id}_username"
					type="text"
					autocomplete="username"
					placeholder="username"
					aria-label="username"
				>
			</div>
			<div class="field">
				<label>Password</label>
				<input 
					@="SignInForm${id}_password"
					type="password"
					autocomplete="current-password"
					placeholder="password"
					aria-label="password"
				>
			</div>
			<div class="field">
		        <button 
					class="ui button icon labeled"
					type="submit"
					@click="SignInForm${id}_submit(true)"
				>
					<i class="plus icon"></i>
					Create Account
				</button>
				<button 
					class="ui button icon labeled primary"
					type="submit"
					@click="SignInForm${id}_submit()"
				>
					<i class="right arrow icon"></i>
					Sign In
				</button>
			</div>
			<hr>
			<p style="text-align: center">
				Or sign in with
			</p>
			<div>
				<a
			        class="ui button icon labeled"
			        href="https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirect}&state=${state}"
			    >
			        <i class="github icon"></i>
			        GitHub
		        </a>
			</div>
		</div>
	`;
});