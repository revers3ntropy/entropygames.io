import Test from '../framework';
import { generateUser } from '../util';

Test.test('Users | user auth', async api => {
    const { userId, sessionId, email } = await generateUser(api);

    let res = await api(`get/sessions/auth-level`, {
        sessionId
    });
    if (!res.ok || res.status !== 200 || res.level < 1) {
        return `0: ${JSON.stringify(res)}`;
    }

    // check code actually works
    res = await api(`get/users`, {
        userId
    });
    if (res.admin !== 0 || res.student !== 1) {
        return `1: ${JSON.stringify(res)}`;
    }
    if (res.email !== email) {
        return `2: ${JSON.stringify(res)}`;
    }
    if (res.year !== 10) {
        return `3: ${JSON.stringify(res)}`;
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
        admin: true
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
    const { userId, sessionId } = await generateUser(api, 0);

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

    const userSes1 = await api(`get/users`, {
        sessionId: res.sessionId
    });
    const userSes2 = await api(`get/users`, {
        sessionId
    });

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

Test.test('Users | with year: 0', async api => {
    const { userId, email } = await generateUser(api, 0);

    let res = await api(`get/users`, { userId });
    if (res['year'] !== 0) {
        return `Expected {..., year: 0} from 'get/users/from-id/userId', got '${JSON.stringify(
            res
        )}'`;
    }
    if (res['email'] !== email) {
        return `Expected {..., name: '${email}'} from 'get/users/from-id/userId', got '${JSON.stringify(
            res
        )}'`;
    }
    if (res['admin'] !== 1) {
        return `Expected {..., admin: 1} from 'get/users/from-id/userId', got '${JSON.stringify(
            res
        )}'`;
    }
    if (res['student'] !== 0) {
        return `Expected {..., student: 0} from 'get/users/from-id/userId', got '${JSON.stringify(
            res
        )}'`;
    }

    await api(`delete/users`, { userId });

    return true;
});

Test.test('Users | Getting info from email', async api => {
    const { userId: userId1, sessionId: sessionId1, email: email1 } = await generateUser(api, 0);
    const { userId: userId2, sessionId: sessionId2, email: email2 } = await generateUser(api);

    let res = await api(`get/users`, {
        email: email2
    });
    if (res?.id !== userId2) {
        return `Expected id '${userId2}' from 'get/users/from-email', got '${res.id}'`;
    }
    if (res?.email !== email2) {
        return `Expected email '${email2}' from 'get/users/from-email', got '${res.email}'`;
    }
    if (!res?.student) {
        return `Expected student to be true from 'get/users/from-email', got '${res.student}'`;
    }
    if (res?.admin !== 0) {
        return `Expected admin to be false from 'get/users/from-email', got '${res.admin}'`;
    }
    if (res?.year !== 10) {
        return `Expected year to be 10 from 'get/users/from-email', got '${res.year}'`;
    }
    if (res?.accepted !== 0) {
        return `Expected accepted to be 0 from 'get/users/from-email', got '${res.accepted}'`;
    }
    if (res?.rejected !== 0) {
        return `Expected rejected to be 0 from 'get/users/from-email', got '${res.rejected}'`;
    }
    if (res?.pending !== 0) {
        return `Expected pending to be 0 from 'get/users/from-email', got '${res.pending}'`;
    }
    if (res?.housePoints?.length !== 0) {
        return `Expected housePoints to be empty from 'get/users/from-email', got '${res.housePoints}'`;
    }

    // check that we can do that again but using the newly created admin code
    res = await api(`get/users`, {
        session: sessionId1,
        email: email2
    });
    if (res.id !== userId2) {
        return `0: ${JSON.stringify(res)}`;
    }

    res = await api(`get/users`, {
        session: sessionId2,
        email: email1
    });
    if (res.id) {
        return `1: ${JSON.stringify(res)}`;
    }
    if (res.email !== email1) {
        return `2: ${JSON.stringify(res)}`;
    }

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });

    return true;
});

Test.test('Users | Getting all', async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api, 0);
    const { userId: userId2, sessionId: sessionId2 } = await generateUser(api);

    let res = await api(`get/users`, {
        session: sessionId2
    });
    if (res.ok || res.status !== 401 || res.data) {
        return `0: ${JSON.stringify(res)}`;
    }
    res = await api(`get/users`, {
        session: sessionId1
    });
    if (res?.data?.length !== 3) {
        return `1: ${JSON.stringify(res)}`;
    }

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });

    return true;
});

Test.test('Users | Getting leaderboard data', async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api, 0);
    const { userId: userId2, sessionId: sessionId2 } = await generateUser(api);

    let res = await api(`get/users/leaderboard`, {
        session: 'invalid session Id'
    });
    if (res.ok || res.status !== 401 || res.data) {
        return `0: ${JSON.stringify(res)}`;
    }
    res = await api(`get/users/leaderboard`, {
        session: sessionId2
    });
    if (!Array.isArray(res.data)) {
        return `1: ${JSON.stringify(res)}`;
    }
    res = await api(`get/users/leaderboard`, {
        session: sessionId1
    });
    if (!Array.isArray(res.data)) {
        return `Expected array from 'get/users/leaderboard', got '${JSON.stringify(res)}'`;
    }

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });

    return true;
});

Test.test('Users | Getting batch data', async api => {
    const { userId: userId1, email: email1 } = await generateUser(api);
    const { userId: userId2, email: email2 } = await generateUser(api);

    let { data: res } = await api(`get/users/batch-info`, {
        userIds: [userId1, userId2]
    });

    if (res?.length !== 2) {
        return `0: ${JSON.stringify(res)}`;
    }

    // comes back in arbitrary order, make sure its in the right order
    if (res[0].id === userId2) {
        [res[0], res[1]] = [res[1], res[0]];
    }

    // check details of two users that we got back
    if (res[0].id !== userId1) {
        return `1: ${JSON.stringify(res)}`;
    }
    if (res[0].email !== email1) {
        return `2: ${JSON.stringify(res)}`;
    }

    if (res[1].id !== userId2) {
        return `3: ${JSON.stringify(res)}`;
    }
    if (res[1].email !== email2) {
        return `4: ${JSON.stringify(res)}`;
    }

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });

    return true;
});

Test.test('Users | Creating', async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api, 0);
    const { userId: userId2, sessionId: sessionId2 } = await generateUser(api);

    let res = await api(`create/users`, {
        session: sessionId2,
        email: 'fake@example.com',
        password: 'mypassword',
        year: 10
    });
    if (res.ok || res.status !== 401) {
        return `0: ${JSON.stringify(res)}`;
    }
    res = await api(`create/users`, {
        sessionId: sessionId1,
        email: 'fake@example.com',
        password: 'mypassword',
        year: 10
    });
    if (!res.ok || res.status !== 201) {
        return `5: ${JSON.stringify(res)}`;
    }

    res = await api(`create/sessions/from-login`, {
        session: '',
        email: 'fake@example.com',
        password: 'mypassword'
    });
    if (!res.ok || res.status !== 200 || !res.sessionId || !res.userId) {
        return `5: ${JSON.stringify(res)}`;
    }

    const { sessionId: sessionId3, userId: userId3 } = res;

    res = await api(`get/users`, {
        session: sessionId1,
        userId: userId3
    });
    if (res.email !== 'fake@example.com') {
        return `6: ${JSON.stringify(res)}`;
    }

    res = await api(`get/users`, {
        session: sessionId3,
        userId: userId3
    });
    if (!res.ok || res.email !== 'fake@example.com') {
        return `7: ${JSON.stringify(res)}`;
    }

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });
    await api(`delete/users`, { userId: userId3 });

    return true;
});

Test.test('Users | Updating admin status', async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api, 0);
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
    if (res['admin'] !== 0) {
        return `1: ${JSON.stringify(res)}`;
    }
    res = await api(`update/users/admin`, {
        session: sessionId1,
        userId: userId2,
        admin: true
    });
    if (!res.ok) {
        return `2: ${JSON.stringify(res)}`;
    }
    res = await api(`get/users`, {
        userId: userId2
    });
    if (res['admin'] !== 1) {
        return `3: ${JSON.stringify(res)}`;
    }

    // TODO updating own
    // TODO Demoting other admins
    // TODO Promoting other admins

    await api(`delete/users`, { userId: userId1 });
    await api(`delete/users`, { userId: userId2 });

    return true;
});

Test.test('Users | Deleting', async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api, 0);
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

Test.test(`Users | Updating year`, async api => {
    const { userId: userId1, sessionId: sessionId1 } = await generateUser(api, 0);
    const { userId: userId2, sessionId: sessionId2 } = await generateUser(api);

    let res = await api(`get/users`, {
        userId: userId2
    });
    if (res['year'] !== 10) {
        return `0: ${JSON.stringify(res)}`;
    }
    res = await api(`update/users/year`, {
        session: sessionId2,
        userId: userId2,
        by: 1
    });
    if (res.ok || res.status !== 401 || res.data) {
        return `1: ${JSON.stringify(res)}`;
    }
    res = await api(`get/users`, {
        sessionId: sessionId2
    });
    if (res['year'] !== 10) {
        return `2: ${JSON.stringify(res)}`;
    }
    res = await api(`update/users/year`, {
        session: sessionId1,
        userId: userId2,
        by: 1
    });
    if (!res.ok) {
        return `3: ${JSON.stringify(res)}`;
    }
    res = await api(`get/users`, { userId: userId2 });
    if (res['year'] !== 11) {
        return `4: ${JSON.stringify(res)}`;
    }
    res = await api(`update/users/year`, {
        session: sessionId1,
        userId: userId2,
        by: -1
    });
    if (!res.ok) {
        return `5: ${JSON.stringify(res)}`;
    }
    res = await api(`get/users`, { userId: userId2 });
    if (res['year'] !== 10) {
        return `6: ${JSON.stringify(res)}`;
    }

    await api(`delete/users`, { userId: userId2 });
    await api(`delete/users`, { userId: userId1 });

    return true;
});

Test.test('Users | wants-award', async api => {
    const { userId, email } = await generateUser(api);
    
    let res = await api('get/users/wants-award');
    if (res?.data?.length !== 0) {
        return `0: ${JSON.stringify(res)}`;
    }
    
    const { id: awardTypeId } = await api('create/award-types', {
        name: 'Test',
        description: 'Testing AT',
        required: 1
    });
    
    const { id: awardTypeId2 } = await api('create/award-types', {
        name: 'requires 2',
        required: 2
    });
    
    res = await api('get/users/wants-award');
    if (res?.data?.length !== 0) {
        return `1: ${JSON.stringify(res)}`;
    }
    
    const { id: housePointId } = await api('create/house-points/give', {
        userId
    });
    
    res = await api('get/users/wants-award');
    if (res?.data?.length !== 1) {
        return `2: ${JSON.stringify(res)}`;
    }
    if (res.data[0].id !== userId) {
        return `3: ${JSON.stringify(res)}`;
    }
    if (res.data[0].awardTypeId !== awardTypeId) {
        return `4: ${JSON.stringify(res)}`;
    }
    if (typeof res.data[0].year !== 'number') {
        return `5: ${JSON.stringify(res)}`;
    }
    if (res.data[0].email !== email) {
        return `6: ${JSON.stringify(res)}`;
    }
    if (res.data[0].awardRequires !== 1) {
        return `7: ${JSON.stringify(res)}`;
    }
    if (res.data[0].accepted !== 1) {
        return `8: ${JSON.stringify(res)}`;
    }
    if (res.data[0].awardName !== 'Test') {
        return `9: ${JSON.stringify(res)}`;
    }
    
    const { id: awardId } = await api('create/awards', {
        userId,
        awardTypeId
    });
    
    res = await api('get/users/wants-award');
    if (res?.data?.length !== 0) {
        return `10: ${JSON.stringify(res)}`;
    }
    
    const { id: hpRequestId } = await api('create/house-points/request', {
        userId
    });
    
    res = await api('get/users/wants-award');
    if (res?.data?.length !== 0) {
        return `11: ${JSON.stringify(res)}`;
    }
    
    await api(`delete/awards`, { awardId });
    await api(`delete/award-types`, { awardTypeId });
    await api(`delete/award-types`, { awardTypeId: awardTypeId2 });
    await api(`delete/users`, { userId });
    await api(`delete/house-points`, { hpRequestId });
    await api(`delete/house-points`, { housePointId });
    
    return true;
});