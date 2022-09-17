import https from 'https';
import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import commandLineArgs from 'command-line-args';
import c from 'chalk';
import connectSQL, { queryFunc } from './sql';
import log, { LogLvl, setupLogger } from './log';
import { loadEnv } from './util';
import requestHandler, { Handler } from './requestHandler';

export interface IFlags {
    logLevel: number;
    dbLogLevel: number;
    logTo: string;
    port: number;
    env: string;
}

export const flags = {
    logLevel: LogLvl.INFO,
    dbLogLevel: LogLvl.WARN,
    port: 0,
    env: '.env',
    ...commandLineArgs([
        {
            name: 'logLevel',
            type: Number,
        },
        {
            name: 'dbLogLevel',
            type: Number,
        },
        { name: 'logTo', type: String },
        { name: 'env', type: String },
        {
            name: 'port',
            alias: 'p',
            type: Number,
        },
    ]),
};

/**
 * Handlers for the api routes
 */
const handlers: Record<string, Handler> = {};

/**
 * Queries the database. Must check if query is available before calling.
 */
export let query: queryFunc | null;

/**
 * Define a route that the server will respond to.
 */
export default function route(path: string, handler: Handler) {
    try {
        handlers[path] = handler;
    } catch (e) {
        log.error`Error adding handler ${path}: ${e}`;
    }
}

import './routes/backups';
import './routes/server';
import './routes/sessions';
import './routes/users';

function startServer() {
    let options = {};
    if (process.env.PROD === '1') {
        if (!process.env.PRIVATE_KEY_PATH || !process.env.CERTIFICATE_PATH) {
            log.error`Missing PRIVATE_KEY_PATH or CERTIFICATE_PATH environment variables.`;
            return;
        }
        options = {
            key: fs.readFileSync(process.env.PRIVATE_KEY_PATH),
            cert: fs.readFileSync(process.env.CERTIFICATE_PATH),
        };
    }

    let port: number | string | undefined = process.env.PORT;

    if (flags.port) {
        port = flags.port;
    }

    if (!port) {
        log.error`No port specified in .env or command line`;
        return;
    }

    let server: http.Server | https.Server;

    async function handle(req: IncomingMessage, res: ServerResponse) {
        if (!query) {
            log.error`No query function available`;
            res.statusCode = 503;
            return res.end(
                JSON.stringify({
                    status: 503,
                    error: 'Waiting for server to start...',
                })
            );
        }
        await requestHandler(req, res, query, handlers);
    }

    try {
        if (process.env.PROD !== '1') {
            server = http.createServer(options, handle).listen(port, () => {
                log.log(c.green(`Dev server started on port ${port}`));
            });
        } else {
            server = https.createServer(options, handle).listen(port, () => {
                log.log(c.green(`Production server started on port ${port}`));
            });
        }
    } catch (e) {
        log.error(`Error starting server: ${e}`);
    }

    process.on('SIGTERM', () => {
        server.close(async () => {
            log.log`Server stopped, stopping process...`;
            await log.close();
            process.exit(1);
        });
    });
}

function connectToMySQL() {
    log.log`Connecting to SQL server...`;
    query = connectSQL();
}

(async () => {

    console.log('Starting server...');

    loadEnv(flags.env);
    setupLogger(flags as IFlags);
    connectToMySQL();
    startServer();
    await log.logToDB('Server started', 'server');
})();
