import { IncomingMessage, ServerResponse } from 'http';
import log from './log';
import now from 'performance-now';
import type { queryFunc } from './sql';

export interface IHandlerArgs {
    url: string;
    res: ServerResponse;
    req: IncomingMessage;
    body: Record<string, unknown>;
    query: queryFunc;
}

export type Handler = (
    args: IHandlerArgs
) => Promise<IJSONResponse | undefined | void | null | string>;

export interface IJSONResponse {
    status?: number;
    ok?: boolean;
    error?: string;
    [k: string | symbol]: any;
}

function getBody(req: IncomingMessage): Promise<Record<any, any> | string> {
    return new Promise(resolve => {
        let data = '';
        // need to get the data one packet at a time, and then deal with the whole lot at once
        req.on('data', chunk => {
            data += chunk;
        });

        req.on('end', () => {
            if (!data) {
                resolve('No body on request');
                return;
            }

            let body: any = {};
            try {
                body = JSON.parse(data);
            } catch (E) {
                log.warn`Error parsing JSON data from URL ${req.url} with JSON ${data}: ${E}`;
                resolve('Cannot parse body');
                return;
            }

            resolve(body);
        });
    });
}

export default async function (
    req: IncomingMessage,
    res: ServerResponse,
    query: queryFunc,
    routes: Record<string, Handler>
) {
    log.verbose`Incoming: ${req.method} ${req.url}`;
    const start = now();

    // set response headers
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', 'application/json');

    let path = req.url;

    // remove '/' at start
    if (path?.[0] === '/') {
        path = path.substring(1);
    }

    // remove '/' at end
    if (path?.[path?.length - 1] === '/') {
        path = path.substring(0, path.length - 1);
    }

    const handler = routes[path || ''];

    if (!path || !(path in routes) || !handler) {
        log.warn`404: ${req.method} '${path}'`;
        res.writeHead(404);
        res.end(
            JSON.stringify({
                status: 404,
                error: `No path matches [${req.method}] '${path}'`
            })
        );
        return;
    }

    let apiRes: any;

    try {
        const body = await getBody(req).catch(e => {
            log.error`Caught Error in Route '${path}' getting req body:\n     ${e} \n    Traceback:\n${e.stack}`;
            res.writeHead(500);
            res.end(
                JSON.stringify({
                    ok: false,
                    status: 500,
                    error: 'Internal server error'
                })
            );
        });

        if (typeof body === 'string' || !body) {
            res.writeHead(400);
            res.end(
                JSON.stringify({
                    ok: false,
                    status: 500,
                    error: body
                })
            );
            return;
        }

        const args: IHandlerArgs = {
            body,
            res,
            req,
            url: req.url || '',
            query
        };

        apiRes = await handler(args).catch(e => {
            log.error`Caught Error in Route '${path}':\n     ${e} \n    Traceback:\n${e.stack}`;
            res.writeHead(500);
            res.end(
                JSON.stringify({
                    ok: false,
                    status: 500,
                    error: 'Internal server error'
                })
            );
        });
    } catch (e: any) {
        apiRes = {
            status: 500,
            error: 'Internal server error'
        };
        log.error`Caught Error in Route '${path}':\n     ${e} \n    Traceback:\n${e.stack}`;
    }

    if (typeof apiRes === 'string') {
        apiRes = { error: apiRes };
    }

    apiRes ||= {};

    if (Array.isArray(apiRes)) {
        log.error`Arrays not allowed from handlers`;
        apiRes = { status: 500 };
    }

    if (typeof apiRes !== 'object') {
        apiRes = {
            error: 'Handler returned non-object',
            value: apiRes
        };
    }

    apiRes = {
        ok: !apiRes.error,
        // status is overridden if present in 'res'
        status: apiRes.error ? 400 : 200,
        ...apiRes
    };

    const strResponse = JSON.stringify(apiRes);

    res.setHeader('Handle-Time', `${(now() - start).toPrecision(2)}ms`);
    res.writeHead(apiRes.status);
    
    await new Promise<void>(r => res.end(strResponse, 'utf8', r));

    let time = now() - start;

    log.verbose`[${req.method}] ${time.toPrecision(2)}ms '${req.url}' => '${strResponse}'`;
}
