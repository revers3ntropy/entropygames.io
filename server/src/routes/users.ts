import emailValidator from 'email-validator';
import mysql from 'mysql2';

import route from '../';

import {
    AUTH_ERR,
    generateUUId,
    idFromSession,
    isAdmin,
    isLoggedIn,
    passwordHash,
    validPassword
} from "../util";

/**
 * @admin
 * Gets all users
 * @param userId
 * @param email
 * @param sessionId
 */
route('get/users', async ({ query, body }) => {
    if (!await isLoggedIn(body, query)) return AUTH_ERR;

    const { userId = '', email = '', sessionId = '', session } = body;

    if (typeof session !== 'string') return AUTH_ERR;

    if (sessionId) {
        if (userId) return `Invalid body: cannot specify both 'session' and 'id'`;
        if (email) return `Invalid body: cannot specify both 'session' and 'email'`;

        const data = await query`
            SELECT
                users.id,
                users.name,
                users.email,
                users.admin
            FROM users, sessions
            WHERE sessions.id = ${sessionId}
                AND sessions.userId = users.id
                AND UNIX_TIMESTAMP(sessions.opened) + sessions.expires > UNIX_TIMESTAMP()
                AND sessions.active = 1
        `;

        if (!data.length)
            return {
                status: 406,
                error: 'User not found'
            };

        return data[0];
    }

    if (email) {
        if (userId) return `Invalid body: cannot specify both 'email' and 'id'`;
        if (!(await isLoggedIn(body, query))) return AUTH_ERR;

        const { email } = body;

        if (!email) return 'No email';

        const data = await query`
            SELECT 
                id,
                email,
                admin,
                name
            FROM users
            WHERE email = ${email}
        `;
        if (!data[0])
            return {
                status: 406,
                error: 'User not found'
            };

        const user = data[0];

        // censor the data if they don't have access
        if (!(await isAdmin(body, query))) {
            const id = await idFromSession(query, session);
            if (id !== user.id) {
                delete user.id;
            }
        }

        return user;
    }

    // gets all users
    if (!userId) {
        if (!(await isAdmin(body, query))) return AUTH_ERR;

        const data = await query`
            SELECT 
                id,
                email, 
                name,
                admin
            FROM users
            ORDER BY
                admin DESC,
                email
        `;

        return { data };
    }

    // user with specific Id
    const data = await query`
        SELECT 
            id,
            email,
            admin,
            name
        FROM users
        WHERE id = ${userId}
    `;

    if (!data.length)
        return {
            status: 406,
            error: 'User not found'
        };

    return data[0];
});

/**
 * @admin
 * Gets the details of multiple users from a list of Ids.
 * Ids are delimited by ','
 * @param {string[]} userIds
 */
route('get/users/batch-info', async ({ query, body }) => {
    if (!(await isAdmin(body, query))) return AUTH_ERR;

    const { userIds: ids } = body;

    if (!(ids as any)?.length)
        return {
            status: 406,
            error: `Invalid 'userIds' parameter`
        };

    const data = await query`
        SELECT 
            id,
            admin,
            name,
            email
        FROM users
        WHERE id IN (${ids})
    `;

    return { data };
});

/**
 * @admin
 * Creates an account from an email and password.
 * Note admin - students cannot create their own accounts
 * Generates a salt and Id for the student.
 * Hashes the password along with the salt before storing it in the DB.
 *
 * @param email
 * @param password
 */
route('create/users', async ({ query, body }) => {
    if (!(await isAdmin(body, query))) return AUTH_ERR;

    let { email = '', password = '', admin=false } = body;

    if (typeof admin !== 'boolean') {
        return `'Admin' is not a boolean`;
    }

    if (typeof email !== 'string') {
        return `Invalid email`;
    }

    if (!emailValidator.validate(email as string)) {
        return `Invalid email`;
    }

    let currentUser = await query`
        SELECT id FROM users WHERE email = ${email}
    `;
    if (currentUser.length) {
        return `User with that email already exists`;
    }

    if (typeof password !== 'string') return `Invalid password`;
    const validPasswordRes = validPassword(password);
    if (typeof validPasswordRes === 'string') {
        return validPasswordRes;
    }

    const [ passHash, salt ] = passwordHash(password);

    const userId = await generateUUId();

    await query`
        INSERT INTO users
            (  id,        email,    password,    salt,    admin, name)
        VALUES
            (${userId}, ${email}, ${passHash}, ${salt}, ${admin}, '')
    `;

    return { status: 201, userId };
});

/**
 * @admin
 * Change a user's admin status from their Id.
 * If the userId is the same as the Id associated with the session in cookies
 * it returns an error.
 * Otherwise, you could remove all admins from the system.
 *
 * @param {1|any} admin - whether they should be an admin now.
 *                        1 for admin, anything else for not admin.
 * @param userId
 */
route('update/users/admin', async ({ query, body }) => {
    if (!(await isAdmin(body, query))) return AUTH_ERR;

    const { userId = '', admin = false, session: mySession } = body;

    if (!mySession) return 'No session Id found';
    if (typeof mySession !== 'string') {
        return 'Session Id is not a string';
    }

    if (typeof admin !== 'boolean') {
        return 'Must specify admin in body';
    }

    if ((await idFromSession(query, mySession)) === userId)
        return {
            status: 403,
            error: 'You cannot change your own admin status'
        };

    const queryRes = await query<mysql.OkPacket>`
        UPDATE users
        SET admin = ${admin}
        WHERE id = ${userId}
   `;
    if (!queryRes.affectedRows)
        return {
            status: 406,
            error: 'User not found'
        };
});

/**
 * Updates the password from a session Id and new password.
 * This is a high risk route, as you are updating the password of a user,
 * and this must be able to be done by a user without login details
 * if they are using the 'forgot password' feature.
 * @param sessionId
 * @param newPassword
 */
route('update/users/password', async ({ query, body }) => {
    const { sessionId = '', newPassword = '' } = body;

    if (typeof sessionId !== 'string') {
        return 'Session Id is not a string';
    }
    const userId = await idFromSession(query, sessionId);

    if (!userId)
        return {
            status: 401,
            error: 'Invalid session Id'
        };

    if (typeof newPassword !== 'string'){
        return 'Password must be a string';
    }
    const validPasswordRes = validPassword(newPassword);
    if (typeof validPasswordRes === 'string') {
        return validPasswordRes;
    }

    const [passHash, salt] = passwordHash(newPassword);

    const queryRes = await query<mysql.OkPacket>`
        UPDATE users
        SET
            password = ${passHash},
            salt = ${salt}
        WHERE id = ${userId}
    `;

    if (!queryRes.affectedRows)
        return {
            status: 406,
            error: 'User not found'
        };

    await query`
        UPDATE sessions
        SET active = 0
        WHERE
            id = ${sessionId}
            OR UNIX_TIMESTAMP(opened) + expires > UNIX_TIMESTAMP()
    `;
});

/**
 * @admin
 * Deletes a user from a user Id
 * @param userId
 */
route('delete/users', async ({ query, body }) => {
    if (!(await isAdmin(body, query))) return AUTH_ERR;

    const { userId, session } = body;

    if (typeof session !== 'string') {
        return 'Session Id is not a string';
    }
    if ((await idFromSession(query, session)) === userId)
        return {
            status: 403,
            error: 'You cannot delete your own account'
        };

    const queryRes = await query<mysql.OkPacket>`
        DELETE FROM users
        WHERE id = ${userId}
    `;
    if (!queryRes.affectedRows)
        return {
            status: 406,
            error: 'User not found'
        };
});
