#!/usr/bin/env zx

import { $ } from 'zx';
import now from 'performance-now';
import c from 'chalk';
import * as fs from 'fs';
import { minify } from 'minify';
import tryToCatch from 'try-to-catch';
import commandLineArgs from 'command-line-args';
import * as dotenv from 'dotenv';
import p from 'path';

export const flags = {
    verbose: false,
    noBack: false,
    noFront: false,
    minify: false,
    env: 'dev',
    ...commandLineArgs([
        {
            name: 'verbose',
            type: Boolean,
            alias: 'v',
        },
        { name: 'noBack', type: Boolean },
        { name: 'noFront', type: Boolean },
        { name: 'minify', type: Boolean, alias: 'm' },
        { name: 'env', type: String, alias: 'e' },
    ]),
};

$.verbose = flags.verbose;

const MINIFY_OPTIONS = {
    html: {
        caseSensitive: true,
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        collapseBooleanAttributes: false,
        removeAttributeQuotes: false,
        removeRedundantAttributes: false,
        useShortDoctype: false,
        removeEmptyAttributes: false,
        removeEmptyElements: false,
        removeOptionalTags: false,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        minifyJS: true,
        minifyCSS: true,
        customAttrAssign: [''],
    },
    css: {
        compatibility: '*',
    },
    js: {
        ecma: 5,
    },
};

async function upload(localPath, remotePath, args = '') {
    return await $`sshpass -f '${process.env.SSH_PASS_FILE}' rsync ${args.split(
        ' ')} ${localPath} ${process.env.REMOTE_ADDRESS}:~${remotePath}`;
}

async function uploadFrontendMinified(dir = '') {
    
    console.log(c.yellow(p.join(process.env.LOCAL_PATH, dir)));

    const paths = fs.readdirSync(p.join(process.env.LOCAL_PATH, dir));

    for (const path of paths) {
        const filePath = p.join(process.env.LOCAL_PATH, dir, path);
        if (fs.statSync(filePath).isDirectory()) {
            await uploadFrontendMinified(p.join(dir, path));
            continue;
        }

        if (
            path.endsWith('.js') ||
            path.endsWith('.css') ||
            path.endsWith('.html')
        ) {
            const [error, data] = await tryToCatch(
                minify,
                filePath,
                MINIFY_OPTIONS
            );
            if (error) {
                console.log(filePath, c.red(error));
                continue;
            }
            const minPath = filePath + '.min';
            fs.writeFileSync(minPath, data);
            await upload(minPath, p.join(process.env.REMOTE_FRONTEND_PATH, dir, path));
            setTimeout(() => fs.rmSync(minPath), 1000);
        }
    }
}

async function uploadFrontend() {
    if (flags.noFront) return;

    console.log(c.green('Uploading frontend...'));

    const paths = fs.readdirSync(process.env.LOCAL_PATH);

    for (const path of paths) {
        // skip hidden files and directories
        if (path[0] === '.') continue;

        console.log(c.yellow(p.join(process.env.LOCAL_PATH, path)));

        if (fs.statSync(p.join(process.env.LOCAL_PATH, path)).isDirectory()) {
            await upload(
                p.join(process.env.LOCAL_PATH, path),
                process.env.REMOTE_FRONTEND_PATH,
                "-r --exclude='*.env'"
            );
            continue;
        }
        await upload(p.join(process.env.LOCAL_PATH, path), process.env.REMOTE_FRONTEND_PATH);
    }
}

async function uploadBackend() {
    if (flags.noBack) return;

    console.log(c.green('Uploading backend...'));

    const paths = {
        './server/index.js': '/index.js',
        './server/index.js.map': '/index.js.map',
        './server/package.json': '/package.json',
        [`./server/${flags.env}.env`]: '/.env',
        [`./server/${flags.env}.Dockerfile`]: '/Dockerfile',
    };

    await Promise.all(
        Object.keys(paths).map(async path => {
            if (fs.existsSync(path)) {
                console.log(c.yellow(path));
                await upload(path, process.env.REMOTE_BACKEND_PATH + paths[path]);
            }
        })
    );
}

(async () => {
    const start = now();
    
    dotenv.config({ path: `./${flags.env}.env` });

    console.log(c.green('Uploading to ' + process.env.REMOTE_ADDRESS));
    
    if (!flags.noFront) {
        if (!flags.minify) {
            await uploadFrontend();
        } else {
            console.log(c.green('Minifying and uploading frontend...'));
            await uploadFrontendMinified();
        }
    }

    await uploadBackend();

    const duration = (now() - start) / 1000;
    console.log(c.green(`Finished Uploading in ${duration.toFixed(3)}s`));
})();
