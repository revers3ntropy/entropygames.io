import fs from 'fs';
import c from 'chalk';
import { generateUUId, removeColour, tagFuncParamsToString } from './util';
import { IFlags, query } from './index';
import mysql from 'mysql2';

export enum LogLvl {
    NONE,
    ERROR,
    WARN,
    INFO,
    VERBOSE
}

/**
 * Remove sensitive info from log messages
 */
export function filterForLogging (str: string) {
    let toFilterOut: string[] = [
        process.env.DB_HOST,
        process.env.DB_USER,
        process.env.DB_PASS,
        process.env.DB,
    ].filter((s): s is string => !!s);
    
    for (const search of toFilterOut) {
        str = str.replace(search, '<REDACTED>');
    }
    
    return str;
}

class Logger {
    private fileHandle?: fs.WriteStream;
    private path = '';
    private level: LogLvl = 3;
    private dbLogLevel: LogLvl = 2;
    private useConsole = true;
    private active = true;

    /**
     * Outputs a message to the console and/or file
     */
    public output(level: LogLvl, type: string, ...messages: any[]): void {
        if (!this.active) {
            return;
        }

        if (this.level < level) {
            return;
        }

        const message =
            `[${type}] ` +
            messages
                .map(m => {
                    // make sure it is all a string
                    if (typeof m === 'string') return m;
                    return JSON.stringify(m, null, 5);
                })
                .join(' ');

        if (this.useConsole) {
            console.log(filterForLogging(message));
        } else {
            fs.appendFileSync(this.path, filterForLogging(message) + '\n');
        }

        if (this.dbLogLevel >= level) {
            this.logToDB(removeColour(message)).then();
        }
    }

    public async logToDB(message: string, from = 'server'): Promise<mysql.OkPacket | undefined> {
        if (!query) return;
        return await query<mysql.OkPacket>`
            INSERT INTO logs (id, msg, madeBy)
            VALUES (${await generateUUId()}, ${filterForLogging(message)}, ${from})
        `;
    }

    /**
     * Logs a message but only if the 'verbose' flag is set
     */
    public verbose(msg: string | TemplateStringsArray, ...params: any[]) {
        this.output(LogLvl.VERBOSE, c.grey`VERB`, tagFuncParamsToString(msg, params));
    }

    /**
     * Logs a message
     */
    public log(msg: string | TemplateStringsArray, ...params: any[]) {
        const message = tagFuncParamsToString(msg, params);

        if (this.dbLogLevel >= LogLvl.INFO) {
            this.logToDB(message).then();
        }

        this.output(LogLvl.INFO, c.grey`INFO`, message);
    }

    /**
     * Logs a warning
     */
    public warn(msg: string | TemplateStringsArray, ...params: any[]) {
        this.output(LogLvl.WARN, c.yellow`WARN`, tagFuncParamsToString(msg, params));
    }

    /**
     * Logs an error
     */
    public error(msg: string | TemplateStringsArray, ...params: any[]) {
        this.output(LogLvl.ERROR, c.red`ERR`, tagFuncParamsToString(msg, params));
    }

    /**
     * Closes any active file handles
     */
    public async close(): Promise<unknown> {
        this.active = false;
        return new Promise(resolve => {
            this.fileHandle?.close?.(resolve);
        });
    }

    public setLogOptions(options: IFlags) {
        this.level = options.logLevel;
        this.level = options.dbLogLevel;
        this.useConsole = !options.logTo;
        this.path = options.logTo;

        if (!this.useConsole) {
            if (!fs.existsSync(this.path)) {
                fs.writeFileSync(this.path, '');
            }

            this.fileHandle = fs.createWriteStream(this.path, {
                flags: 'a'
            });

            this.log(`Logging to file: ${this.path}`);
        }
        this.output(LogLvl.ERROR, 'START', new Date().toISOString());
    }
    
    // Singleton instance of this class
    public static instance: Logger = new Logger();
}

export function setupLogger(options: IFlags) {
    Logger.instance.setLogOptions(options);
}

export default Logger.instance;
