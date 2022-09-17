import c from 'chalk';
import fetch from 'node-fetch';
import commandLineArgs, { CommandLineOptions } from 'command-line-args';
import childProcess from 'child_process';
import now from 'performance-now';

import setup from './setup';
import Test from './framework';

import './tests/server.spec';
import './tests/self.spec';
import './tests/users.spec';
import './tests/backups.spec';

const flags = commandLineArgs([
    { name: 'verbose', alias: 'v', type: Boolean },
    { name: 'deploy', alias: 'd', type: String },
]);

export type API = (path: string, body?: any) => Promise<any>;
export type testExecutor = (
    api: API,
    args: CommandLineOptions
) => Promise<boolean | Error | string>;

const adminPassword = 'password';
const adminEmail = 'admin@example.com';

let adminSessionId: string | null = null;

/**
 * Makes API request to localhost API server
 * Uses http, and the port stored in the .env file
 */
async function api(path: string, body: Record<string, any> = {}): Promise<any> {
    // assume host is localhost
    const url = `http://localhost:${process.env.PORT}/${path}`;

    if (!body.session && body.session !== '') {
        if (adminSessionId === null) {
            let res = await api(`create/sessions/from-login`, {
                email: adminEmail,
                password: adminPassword,
                session: '',
            });
            if (res.error || !res.ok) {
                throw c.red(res.error);
            }
            adminSessionId = res.sessionId;
            console.log(c.green(`Got admin session Id: ${adminSessionId}`));
        }
        body.session = adminSessionId;
    }

    // get request to api server
    const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
        },
    }).catch(e => {
        // don't do anything fancy with fetch errors, just log them
        console.log(c.red`Error in API request`);
        console.log(e);
    });

    if (!res) {
        console.log(`No response on path '${path}'`);
        return { error: 'No response' };
    }

    // get text content of response
    const resBody = await res.text();

    if (flags.verbose) {
        console.log(`${c.yellow`API`} '${url}': ${resBody}`);
    }

    return JSON.parse(resBody);
}

export async function deploy(flags: commandLineArgs.CommandLineOptions): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
        let invoked = false;

        let fork = childProcess.fork(
            './bin/upload.js',
            ['-m', '-e', flags.deploy]
        );

        // listen for errors as they may prevent the exit event from firing
        fork.on('error', err => {
            if (invoked) return;
            invoked = true;
            reject(err);
        });

        // execute the callback once the process has finished running
        fork.on('exit', code => {
            if (invoked) return;
            invoked = true;
            if (code !== 0) {
                reject(new Error('exit code ' + code));
            } else {
                resolve();
            }
        });
    });
}

(async () => {
    let start = now();

    const timeSinceStart = (): string => {
        const t = now() - start;
        return t.toFixed(2);
    };

    await setup(flags);

    const testRes = await Test.testAll(api, flags);
    console.log(testRes.str());

    // stop the server process by sending it a 'kill signal'
    const killServerRes = await api(`delete/server`);
    if (killServerRes.ok) {
        console.log(
            c.green(`Server Killed, finished testing in ${timeSinceStart()}ms`)
        );
    } else {
        console.log(
            c.red(`Server not killed: ${JSON.stringify(killServerRes)}`)
        );
    }

    if (testRes.failed === 0 && flags.deploy) {
        console.log('All tests passed, Deploying...');
        deploy(flags).then(() => {
            console.log(c.green('Finished in ' + timeSinceStart() + 'ms'));
        });
    }
})();
