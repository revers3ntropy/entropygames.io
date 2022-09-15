import route from '../index';
import mysql from 'mysql2';
import fs from 'fs';
import log from "../log";
import { AUTH_ERR, generateUUId, isAdmin } from "../util";
import mysqldump, { ConnectionOptions } from "mysqldump";

route('get/backups', async ({ query, body }) => {
    if (!await isAdmin(body, query)) return AUTH_ERR;
    const { limit = 100 } = body;

    if (typeof limit !== 'number' || !Number.isInteger(limit)) {
        return 'Invalid body.limit: must be integer';
    }

    if (limit > 0) {
        return {
            data: query`
			SELECT
				id,
				name,
				UNIX_TIMESTAMP(created) as created
			FROM backups
			LIMIT ${limit}
		`
        }
    }

    return {
        data: query`
			SELECT
				id,
				name,
				UNIX_TIMESTAMP(created) as created
			FROM backups
		`
    }
});

route('create/backups', async ({ query, body }) => {
    if (!await isAdmin(body, query)) return AUTH_ERR;

    if (!fs.existsSync('./backups')) {
        fs.mkdirSync('./backups');
    }

    const id = await generateUUId();
    const dumpFileName = `./backups/${id}.dump.sql`;

    const connection: ConnectionOptions = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER || '',
        password: process.env.DB_PASS || '',
        database: process.env.DB || '',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    };

    await mysqldump({
        connection,
        dumpToFile: dumpFileName
    }).catch(e => {
        log.error(`Error in mysqldump (making backup): ${e}`);
    });
    await query`
		INSERT INTO backups
			(id, name)
		VALUES
            (${id}, ${id})
	`;

    return { name: id, id };
});

route('update/backups/restore-from', async ({ query, body }) => {
    if (!await isAdmin(body, query)) return AUTH_ERR;

    const { backupId } = body;
    if (typeof backupId !== 'string' || !backupId) {
        return 'Invalid body.backupId: must be string';
    }
});

route('update/backups/name', async ({ query, body }) => {
    if (!await isAdmin(body, query)) return AUTH_ERR;

    const { backupId, name } = body;

    if (typeof backupId !== 'string') {
        return 'Invalid backup Id: must be a string';
    }

    if (typeof name !== 'string' || !name) {
        return 'Invalid name';
    }

    const queryRes = await query<mysql.OkPacket>`
        UPDATE backups
        SET name = ${name}
        WHERE id = ${backupId}
    `;

    if (queryRes.affectedRows === 0) return {
        status: 406,
        error: `No backups to update with that id`
    };
});

route('delete/backups', async ({ query, body }) => {
    if (!await isAdmin(body, query)) return AUTH_ERR;

    const { backupId } = body;




});