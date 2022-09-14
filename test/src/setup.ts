import mysql from 'mysql2';
import fs from 'fs';
import now from 'performance-now';
import c from 'chalk';
import { config } from 'dotenv';
import type { CommandLineOptions } from 'command-line-args';
import { exec } from 'child_process';

async function startServer(_: CommandLineOptions): Promise<void> {
    let t = now();

    return new Promise((resolve, reject) => {
        exec(`cd server; webpack`, (err, _, er) => {
            if (err) reject(err);
            if (er) reject(er);

            console.log(c.green(`Built server in ${(now() - t).toPrecision(4)}ms`));
            t = now();

            exec(
                `node --enable-source-maps server --logTo=test.log --logLevel=4 --dbLogLevel=2`,
                (err, _, er) => {
                    if (err) reject(err);
                    if (er) reject(er);
                }
            );

            console.log(c.green(`Server starting`));

            // wait for the server to start
            setTimeout(resolve, 500);
        });
    });
}

export default async function setup(flags: CommandLineOptions): Promise<void> {
    // setup environment variables
    config({ path: './server/.env' });

    await startServer(flags);

    let con = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB,
        multipleStatements: true
    });

    return new Promise<void>((resolve, reject) => {
        con.query(
            `
			DROP DATABASE ${process.env.DB};
			CREATE DATABASE ${process.env.DB};
			use ${process.env.DB};
		`,
            err => {
                if (err) {
                    reject(`${err}, ${err.stack}`);
                    return;
                }

                console.log(c.green`Database created`);

                const setUpQuery = fs.readFileSync('./sql/schema.sql', 'utf8');

                con.query(setUpQuery, err => {
                    if (err) {
                        reject(`${err}, ${err.stack}`);
                        return;
                    }

                    console.log(c.green`Database schema created`);
                    con.end();

                    resolve();
                });
            }
        );
    });
}
