import emailValidator from 'email-validator';
import mysql from 'mysql2';

import route from '../';

import {
    AUTH_ERR,
    generateUUId,
    idFromSession,
    isAdmin,
    passwordHash, userFromSession,
    validPassword
} from "../util";
import log from "../log";

/**
 * @admin
 * Gets all users
 * @param userId
 * @param email
 * @param sessionId
 */
route('get/users', async ({ query, body }) => {
    const { userId = '', email = '', username = '', sessionId = '' } = body;

    if (sessionId) {
        if (typeof sessionId !== 'string') {
            return 'Invalid session Id';
        }
        if (userId || email || username) {
            return 'Cannot specify userId, email or username with sessionId';
        }
        const res = await userFromSession(query, sessionId);
        if (!res) return AUTH_ERR;
        return res;
    }

    let res: any = await query`
        SELECT
            id,
            username,
            name,
            email,
            email_verified,
            admin,
            UNIX_TIMESTAMP(created) as created
        FROM users
        WHERE
                ((id = ${userId})           OR ${!userId})
            AND ((email = ${email})         OR ${!email})
            AND ((username = ${username})    OR ${!username})
            
        ORDER BY admin, created
    `;

    if (username || userId) {
        if (res.length === 0) {
            return 'User not found';
        }
        if (res.length > 1) {
            log.error('Multiple users found for username or id');
            return 'Internal Error';
        }

        res = res[0];
        if (!await isAdmin(body, query)) {
            const user = await userFromSession(query, body.session);
            if (!user || res['userId'] === user['id']) {
                delete res['id'];
                delete res['email'];
                delete res['email_verified'];
                delete res['name'];
            }
        }
        return res;

    } else {
        if (!(await isAdmin(body, query))) {
            const user = await userFromSession(query, body.session);
            if (!user) return AUTH_ERR;
            if (!user['id']) return AUTH_ERR;

            if (Array.isArray(res)) {
                for (let i = 0; i < res.length; i++) {
                    if (res[i]?.['userId'] === user['id']) {
                        continue;
                    }

                    // if the user does not have access to the user,
                    // remove sensitive information
                    delete res[i]?.['id'];
                    delete res[i]?.['email'];
                    delete res[i]?.['email_verified'];
                    delete res[i]?.['name'];
                }
            }
        }
        return { data: res };
    }
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
    let { username = '', password = '', admin=0 } = body;

    if (typeof admin !== 'number') {
        return `'Admin' is not a number`;
    }
    if (admin > 1 || admin < 0) {
        return `'Admin' must be either 0 or 1`;
    }
    if(!await isAdmin(body, query) && admin) {
        return 'Only admins can create admins';
    }

    if (typeof username !== 'string') {
        return `Invalid email`;
    }

    let currentUser = await query`
        SELECT id FROM users WHERE username = ${username}
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
            (  id,        username,    password,    salt,    admin)
        VALUES
            (${userId}, ${username}, ${passHash}, ${salt}, ${admin})
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

    const { userId = '', admin = 0, session: mySession } = body;

    if (!mySession) return 'No session Id found';
    if (typeof mySession !== 'string') {
        return 'Session Id is not a string';
    }

    if (typeof admin !== 'number') {
        return 'Must specify number admin in body';
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
