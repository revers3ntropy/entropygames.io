import Test from '../framework';
import { generateUser } from '../util';

Test.test('Users | user auth', async api => {
    const { userId, sessionId, username } = await generateUser(api);

    let res = await api(`get/sessions/auth-level`, { sessionId });

    if (!res.ok || res.status !== 200 || res.level < 1) {
        return `0: ${JSON.stringify(res)}`;
    }

    // check code actually works
    res = (await api(`get/users`, {
        userId
    }));
    if (res.admin !== 0) {
        return `1: ${JSON.stringify(res)}`;
    }
    if (res.username !== username) {
        return `2: ${JSON.stringify(res)}`;
    }

    // checks that the total number of users is correct
    res = await api(`get/users`);
    if (!res.ok) {
        return `4: ${JSON.stringify(res)}`;
    }
    // 2 due to the user we just created and the default admin user
    if (res?.data?.length !== 2) {
        return `5: ${JSON.stringify(res)}`;
    }

    // make our user an admin
    res = await api(`update/users/admin`, {
        userId,
        admin: 1
    });
    if (!res.ok) {
        return `6: ${JSON.stringify(res)}`;
    }

    // check new auth level
    res = await api(`get/sessions/auth-level`, {
        sessionId
    });
    if (res.level !== 2) {
        return `7: ${JSON.stringify(res)}`;
    }

    // check we can access restricted data with our code
    res = await api(`get/users`, {
        session: sessionId
    });
    if (res?.data?.length !== 2) {
        return `8: ${JSON.stringify(res)}`;
    }

    // delete our user
    res = await api(`delete/users`, {
        userId
    });
    if (!res.ok) {
        return `9: ${JSON.stringify(res)}`;
    }

    // check that the user is gone
    res = await api(`get/sessions/auth-level`, {
        sessionId
    });
    if (res.level !== 0) {
        return `10: ${JSON.stringify(res)}`;
    }

    return true;
});

Test.test('Users | auth with 2', async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api);
    const { userId: userId2, sessionId: sessionId2 } = await generateUser(api);

    if (userId1.length < 2 || userId2.length < 2) {
        return `Expected userId to be at least 2 characters, got: '${userId1}' and '${userId2}'`;
    }
    if (userId1 === userId2) {
        return `Expected different userIds, got '${userId1}' and '${userId2}'`;
    }

    if (sessionId1.length < 2 || sessionId2.length < 2) {
        return `Expected userId to be at least 2 characters, got: '${sessionId1}' and '${sessionId2}'`;
    }
    if (sessionId1 === sessionId2) {
        return `Expected different userIds, got '${sessionId1}' and '${sessionId2}'`;
    }

    // check that both codes have been made and work
    let res = await api(`get/sessions/auth-level`, {
        sessionId: sessionId1
    });
    if (res.level !== 1) {
        return `0: ${JSON.stringify(res)}`;
    }
    res = await api(`get/sessions/auth-level`, {
        sessionId: sessionId2
    });
    if (res.level !== 1) {
        return `1: ${JSON.stringify(res)}`;
    }

    // checks that the total number of users is correct
    res = await api(`get/users`);
    if (!res.ok) {
        return `2: ${JSON.stringify(res)}`;
    }
    // 3 due to the 2 we just created and the default admin user
    if (res?.data?.length !== 3) {
        return `3: ${JSON.stringify(res)}`;
    }

    res = await api(`delete/users`, {
        userId: userId2
    });
    if (!res.ok) {
        return `4: ${JSON.stringify(res)}`;
    }
    res = await api(`delete/users`, {
        userId: userId1
    });
    if (!res.ok) {
        return `5: ${JSON.stringify(res)}`;
    }

    return true;
});

Test.test('Users | sign in with user Id', async api => {
    const { userId, sessionId } = await generateUser(api, 1);

    let res = await api(`create/sessions/from-user-id`, {
        userId
    });
    if (!res.ok) {
        return `0: ${JSON.stringify(res)}`;
    }
    if (res.sessionId === sessionId) {
        return `Expected different sessionId, both were '${res.sessionId}'`;
    }
    if (res.userId !== userId) {
        return `Expected userId to be '${userId}', got '${res.userId}'`;
    }

    const userSes1 = (await api(`get/users`, {
        sessionId: res.sessionId
    }));
    const userSes2 = (await api(`get/users`, {
        sessionId
    }));

    if (!Test.eq(userSes1, userSes2)) {
        return `Expected same from users: '${JSON.stringify(userSes1)}' and '${JSON.stringify(
            userSes2
        )}'`;
    }

    await api(`delete/users`, {
        userId
    });

    return true;
});

Test.test('Users | Getting info from username', async api => {
    const { userId: userId1, sessionId: sessionId1, username: username1 } = await generateUser(api, 1);
    const { userId: userId2, sessionId: sessionId2, username: username2 } = await generateUser(api);

    let res = (await api(`get/users`, {
        username: username2
    }));
    if (res?.id !== userId2) {
        return `Expected id '${userId2}' from 'get/users/from-username', got '${res.id}'`;
    }
    if (res?.username !== username2) {
        return `Expected username '${username2}' from 'get/users/from-username', got '${res.username}'`;
    }
    if (res?.admin !== 0) {
        return `Expected admin to be false from 'get/users/from-username', got '${res.admin}'`;
    }

    // check that we can do that again but using the newly created admin code
    res = await api(`get/users`, {
        session: sessionId1,
        username: username2
    });
    if (res.id !== userId2) {
        return `0: ${JSON.stringify(res)}`;
    }

    res = await api(`get/users`, {
        session: sessionId2,
        username: username1
    });
    if (res.id) {
        return `1: ${JSON.stringify(res)}`;
    }
    if (res.username !== username1) {
        return `2: ${JSON.stringify(res)}`;
    }

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });

    return true;
});

Test.test('Users | Getting all', async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api, 1);
    const { userId: userId2, sessionId: sessionId2 } = await generateUser(api);

    let res = await api(`get/users`, {
        session: sessionId2
    });
    if (!res.ok || !res.data) {
        return `0: ${JSON.stringify(res)}`;
    }
    if (res.data.length !== 3) {
        return `1: ${JSON.stringify(res)}`;
    }
    if ('id' in res.data[0]) {
        return `2: ${JSON.stringify(res)}`;
    }
    res = await api(`get/users`, {
        session: sessionId1
    });
    if (res?.data?.length !== 3) {
        return `3: ${JSON.stringify(res)}`;
    }
    if (!('id' in res.data[0])) {
        return `4: ${JSON.stringify(res)}`;
    }

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });

    return true;
});

Test.test('Users | Creating', async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api, 1);
    const { userId: userId2, sessionId: sessionId2 } = await generateUser(api);

    let res = await api(`create/users`, {
        session: sessionId2,
        username: 'fake',
        password: 'mypassword'
    });
    if (res.ok || res.status !== 401) {
        return `0: ${JSON.stringify(res)}`;
    }
    res = await api(`create/users`, {
        sessionId: sessionId1,
        username: 'fake',
        password: 'mypassword'
    });
    if (!res.ok || res.status !== 201) {
        return `5: ${JSON.stringify(res)}`;
    }

    res = await api(`create/sessions/from-login`, {
        session: 'some invalid session',
        username: 'fake',
        password: 'mypassword'
    });
    if (!res.ok || res.status !== 200 || !res.sessionId || !res.userId) {
        return `5: ${JSON.stringify(res)}`;
    }

    const { sessionId: sessionId3, userId: userId3 } = res;

    res = (await api(`get/users`, {
        session: sessionId1,
        userId: userId3
    }));
    if (res.username !== 'fake') {
        return `6: ${JSON.stringify(res)}`;
    }

    res = await api(`get/users`, {
        session: sessionId3,
        userId: userId3
    });
    if (res.username !== 'fake') {
        return `7: ${JSON.stringify(res)}`;
    }

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });
    await api(`delete/users`, { userId: userId3 });

    return true;
});

Test.test('Users | Updating admin status', async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api, 1);
    const { userId: userId2, sessionId: sessionId2 } = await generateUser(api);

    let res = await api(`update/users/admin`, {
        session: sessionId2,
        userId: userId2,
        admin: true
    });
    if (res.ok || res.status !== 401 || res.data) {
        return `0: ${JSON.stringify(res)}`;
    }
    res = await api(`get/users`, {
        userId: userId2
    });
    if (res.data?.[0]?.['admin'] !== 0) {
        return `1: ${JSON.stringify(res)}`;
    }
    res = await api(`update/users/admin`, {
        session: sessionId1,
        userId: userId2,
        admin: 1
    });
    if (!res.ok) {
        return `2: ${JSON.stringify(res)}`;
    }
    res = await api(`get/users`, {
        userId: userId2
    });
    if (res?.data?.[0]?.['admin'] !== 1) {
        return `3: ${ JSON.stringify(res) }`;
    }

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });

    return true;
});

Test.test('Users | Deleting', async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api, 1);
    const { userId: userId2, sessionId: sessionId2 } = await generateUser(api);
    const { userId: userId3, sessionId: sessionId3 } = await generateUser(api);

    // non-admin deleting admin
    let res = await api(`delete/users`, {
        session: sessionId2,
        userId: userId1
    });
    if (res.ok || res.status !== 401 || res.code) {
        return `0: ${JSON.stringify(res)}`;
    }
    res = await api(`get/sessions/auth-level`, {
        sessionId: sessionId1
    });
    if (res.level !== 2) {
        return `1: ${JSON.stringify(res)}`;
    }
    // non-admin deleting non-admin
    res = await api(`delete/users`, {
        session: sessionId2,
        userId: userId3
    });
    if (res.ok || res.status !== 401 || res.code) {
        return `2: ${JSON.stringify(res)}`;
    }
    res = await api(`get/sessions/auth-level`, {
        sessionId: sessionId3
    });
    if (res.level !== 1) {
        return `3: ${JSON.stringify(res)}`;
    }

    // Admin deleting non-admin
    res = await api(`delete/users`, {
        session: sessionId1,
        userId: userId2
    });
    if (!res.ok) {
        return `4: ${JSON.stringify(res)}`;
    }
    res = await api(`get/sessions/auth-level`, {
        sessionId: sessionId2
    });
    if (res.level !== 0) {
        return `5: ${JSON.stringify(res)}`;
    }

    // Deleting self
    res = await api(`delete/users`, {
        session: sessionId1,
        userId: userId1
    });
    if (res.ok || res.status !== 403 || res.code) {
        return `6: ${JSON.stringify(res)}`;
    }
    res = await api(`get/sessions/auth-level`, {
        sessionId: sessionId1
    });
    if (res.level !== 2) {
        return `7: ${JSON.stringify(res)}`;
    }

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });
    await api(`delete/users`, { userId: userId3 });

    return true;
});
