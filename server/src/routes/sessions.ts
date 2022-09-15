import route from '../index';
import log from '../log';
import { AUTH_ERR, authLvl, generateUUId, isAdmin } from '../util';
import emailValidator from 'email-validator';
import * as notifications from '../notifications';
import type mysql from 'mysql2';

/**
 * Gets the authorisation level of a session Id
 * Note that this is one of the few routes which does not require logged in or admin.
 *
 * @param sessionId
 * @returns 0 for invalid/expired, >= 1 for logged in, 2 for admin user
 */
route('get/sessions/auth-level', async ({ query, body }) => {
    const { sessionId = '' } = body;

    if (typeof sessionId !== 'string') return 'Invalid session Id';
    return {
        level: await authLvl(sessionId, query)
    };
});

/**
 * @admin
 * Gets details about all sessions which have not yet expired.
 * Not really any purpose other than monitoring the server.
 */
route('get/sessions/active', async ({ query, body }) => {
    if (!(await isAdmin(body, query))) return AUTH_ERR;

    return {
        data: await query`
        SELECT 
            users.email,
            users.id as userId,
            sessions.id,
            UNIX_TIMESTAMP(sessions.opened) as opened
        FROM sessions, users
        WHERE
            sessions.userId = users.id
            AND UNIX_TIMESTAMP(sessions.opened) + sessions.expires > UNIX_TIMESTAMP()
            AND sessions.active = 1
        ORDER BY opened DESC
    `
    };
});

/**
 * Creates a session from login details
 * Note that the password is sent in cleartext to the server before being hashed in the database,
 * which could pose a security threat.
 *
 * @param {number} [expires=86400] - the number of seconds the session should be valid for
 * @param email
 * @param password
 */
route('create/sessions/from-login', async ({ query, body }) => {
    // password in plaintext
    const { email = '', password = '', expires = 86400 } = body;

    if (!email || !password) {
        return 'Missing email or password';
    }

    if (typeof expires !== 'number' || !Number.isInteger(expires)) {
        return 'Invalid expires parameter';
    }
    if (expires > 86400 * 365) {
        return 'Session must expire within a year';
    }
    if (expires < 1) {
        return 'Session must not have already expired';
    }

    // don't bother validating email here,
    // makes it slightly quickly for slightly less info to user
    // invalid emails can't be added to the database anyway

    const res = await query`
        SELECT id
        FROM users
        WHERE email = ${email}
            AND password = SHA2(CONCAT(${password}, salt), 256);
    `;

    if (!res[0]) return 'Invalid email or password';
    if (res.length > 1) {
        // don't tell the user about this, it's a security issue
        log.error`Multiple users found with email ${email}`;
        return 'Invalid email or password';
    }

    const sessionId = await generateUUId();

    await query`
        INSERT INTO sessions (id, userId, expires)
        VALUES (${sessionId}, ${res[0].id}, ${expires});
    `;

    return { sessionId, userId: res[0].id };
});

/**
 * @admin
 * Creates a session from a user Id.
 * This is an admin route because you should only be able to create a session from a
 * user Id if you already have a valid session.
 * This means the root of all sessions is valid login details.
 * Otherwise, if someone's userId was leaked, it could be used to continually generate sessions,
 * removing the benefits of sessions entirely over simply using the userId as the auth token.
 *
 * @param {number} [expires=86400] - the number of seconds the session should be valid for
 * @param userId
 */
route('create/sessions/from-user-id', async ({ query, body }) => {
    if (!(await isAdmin(body, query))) return AUTH_ERR;

    const { userId = '', expires = 86400 } = body;

    if (!userId) {
        return 'UserId not specified';
    }
    if (typeof expires !== 'number' || !Number.isInteger(expires)) {
        return 'Invalid expires parameter';
    }
    if (expires > 86400 * 365) {
        return 'Session must expire within a year';
    }
    if (expires < 1) {
        return 'Session must not have already expired';
    }

    const res = await query`
        SELECT email
        FROM users
        WHERE id = ${userId}
    `;
    if (!res.length) return 'Invalid userId';

    const sessionId = await generateUUId();

    await query`
        INSERT INTO sessions (id, userId, expires)
        VALUES (${sessionId}, ${userId}, ${expires});
    `;

    return { sessionId, userId };
});

/**
 * Runs the 'forgotten password' flow.
 * Takes an email and sends a link to their email with a new session
 * which expires in 1 hour.
 * @param email
 */
route('create/sessions/for-forgotten-password', async ({ query, body }) => {
    const { email = '' } = body;

    if (!email || typeof email !== 'string') {
        return 'Invalid email';
    }
    if (!emailValidator.validate(email)) {
        return 'Invalid email';
    }

    const res = await query`
        SELECT id
        FROM users
        WHERE email = ${email}
    `;
    if (!res.length) return 'Invalid email';
    if (res.length > 1) {
        // don't tell the user about this, it's a security issue
        log.error`Multiple users found with email '${email}'`;
        return 'Invalid email';
    }
    const userId = res[0]?.id;
    const sessionId = await generateUUId();

    await query`
        INSERT INTO sessions (id, userId, expires)
        VALUES (${sessionId}, ${userId}, ${60 * 60});
    `;

    await notifications.forgottenPasswordEmail(query, userId, sessionId);
});

/**
 * Removes the session from the database
 * @param sessionId
 */
route('delete/sessions/with-id', async ({ query, body }) => {
    const { sessionId = '' } = body;

    if (!sessionId) return 'Session Id not specified';

    const queryRes = await query<mysql.OkPacket>`
        UPDATE sessions
        SET active = 0
        WHERE id = ${sessionId}
    `;
    if (queryRes.affectedRows === 0)
        return {
            status: 406,
            error: `Session not found`
        };
});
