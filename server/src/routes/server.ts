import now from 'performance-now';
import { cpuUsage } from 'node:process';

import route from '../';
import { AUTH_ERR, isAdmin, isLoggedIn } from '../util';
import log from '../log';

/**
 * Hello World route
 * Mainly for debugging, should remove at some point
 * TODO: remove
 */
route('', async () => {
    return { message: 'Hello World' };
});

/**
 * Simply returns an {ok: true} message
 */
route('get/server/ping', async () => {});

/**
 * @admin
 * Get the process Id of the Node process running this server
 */
route('get/server/pid', async ({ query, body }) => {
    if (!(await isAdmin(body, query))) return AUTH_ERR;

    return { pid: process.pid };
});

/**
 * @account
 * Runs a basic SQL query and returns an error if the query fails
 */
route('get/server/check', async ({ query, body }) => {
    if (!(await isLoggedIn(body, query))) return AUTH_ERR;

    if ((await query`SELECT * FROM users LIMIT 1`).length !== 1) {
        return 'Something went wrong';
    }
});

/**
 * @account
 * Echos the body of the request back
 */
route('get/server/echo', async ({ body, query }) => {
    if (!(await isLoggedIn(body, query))) return AUTH_ERR;

    return body;
});

/**
 * Makes a log
 * @param message
 * @param {int} [logLevel=2]
 */
route('create/server/logs', async ({ body }) => {
    let { message, logLevel = 2 } = body;

    if (typeof message !== 'string') {
        message = JSON.stringify(message);
    }

    if (typeof logLevel !== 'number' || !Number.isInteger(logLevel)) {
        return { error: 'logLevel must be an integer' };
    }
    if (logLevel < 0 || logLevel > 4) {
        return { error: 'logLevel is invalid' };
    }

    log.output(logLevel, message as string);
});

/**
 * Makes a log
 * @param message
 * @param {int} [logLevel=2]
 */
route('get/server/logs', async ({ body, query }) => {
    if (!await isAdmin(body, query)) return AUTH_ERR;
    
    const { limit = 100 } = body;
    
    if (typeof limit !== 'number' || !Number.isInteger(limit)) {
        return 'limit must be an integer';
    }
    
    if (limit < 0 || limit > 10_000) {
        return 'limit is invalid';
    }
    
    return {
        data: await query`
            SELECT
                id,
                UNIX_TIMESTAMP(time) AS time,
                madeBy,
                msg
            FROM logs
            ORDER BY time DESC
            LIMIT ${limit}
        `
    }
});

/**
 * @account
 * Measures the performance of running 'n' simple SQL queries and
 * returns some stats on the timing data
 * @param {int} [iterations=100]
 */
route('get/server/performance', async ({ query, body }) => {
    if (!(await isLoggedIn(body, query))) return AUTH_ERR;

    const start = now();

    const n = parseInt(body?.iterations as string || '100');
    if (!n) return 'Invalid iterations';
    // easy way to DOS server with big numbers...
    if (n > 1000) return 'Iterations too big';
    if (n < 1) return 'Iterations too small';

    for (let i = 0; i < n; i++) {
        await query`SELECT * FROM users LIMIT 1`;
    }

    const time = now() - start;

    return {
        time: time,
        iterations: n,
        avPerIteration: time / n
    };
});

route('get/server/health', async ({ query, body }) => {
    if (!(await isAdmin(body, query))) return AUTH_ERR;

    return {
        cpu: cpuUsage(),
        memory: process.memoryUsage(),
        resourceUsage: process.resourceUsage(),
        pid: process.pid,
        ppid: process.ppid,
        uptime: process.uptime(),
        platform: process.platform,
        arch: process.arch,
        versions: process.versions,
        build: process.env.npm_package_version,
        node: process.version
    };
});

/**
 * @admin
 * Kills this process
 * Note that this doesn't immediately kill the process, just sends a kill signal
 * This allows the server to close any connections and shutdown gracefully
 */
route('delete/server', async ({ query, body }) => {
    if (!(await isAdmin(body, query))) return AUTH_ERR;

    process.kill(process.pid, 'SIGTERM');
});
