import type { API } from './index';

export const alphabet = 'abcdefghijklmnopqrstuvwxyz';

export const randomFromAlph = (len = 5): string => {
    let str = '';
    for (let i = 0; i < len; i++) {
        str += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return str;
};

export interface IGenerateUserRes {
    password: string;
    sessionId: string;
    userId: string;
    username: string;
}

/**
 * Just throws error if something goes wrong, doesn't bother to return an erroneous response.
 * If year is 0 then it makes them an admin.
 */
export async function generateUser(api: API, admin: number = 0): Promise<IGenerateUserRes> {
    const username = randomFromAlph(10);
    const password = randomFromAlph(10);

    let res = await api(`create/users`, {
        username,
        password,
        admin
    });
    if (res.ok !== true || (res.status !== 200 && res.status !== 201)) {
        throw `create/users/email/password failed: ${JSON.stringify(res)}`;
    }

    res = await api(`create/sessions/from-login`, {
        username,
        password,
    });
    if (
        res.ok !== true ||
        res.status !== 200 ||
        typeof res.sessionId !== 'string' ||
        typeof res.userId !== 'string'
    ) {
        throw `create/sessions/from-login/username/password failed: ${JSON.stringify(res)}`;
    }

    return { username, password, ...res };
}
