import Test from '../framework';
import c from 'chalk';

Test.test('Smoke | Ping server', async api => {
    let res = await api('get/server/ping');
    if (res.ok !== true) {
        return `0: ${JSON.stringify(res)}`;
    }

    res = await api(`get/server/ping`, {
        session: ''
    });
    if (res.ok !== true) {
        return `1: ${JSON.stringify(res)}`;
    }

    return true;
});

Test.test('Smoke | echo from server', async api => {
    let res = await api('get/server/echo', {
        msg: 'hello-world'
    });
    if (res.ok !== true) {
        return `echo failed: ${JSON.stringify(res)}`;
    }
    if (res.msg !== 'hello-world') {
        return `echo failed: ${JSON.stringify(res)}`;
    }

    res = await api(`get/server/echo`, {
        session: '',
        msg: 'hi'
    });
    if (res.status !== 401 || res.ok || res.msg) {
        return `Expected 401, got ${JSON.stringify(res)}`;
    }

    return true;
});

Test.test('Smoke | Check SQL status of server', async api => {
    let res = await api('get/server/check');
    if (res.ok !== true) {
        return `echo failed: ${JSON.stringify(res)}`;
    }

    res = await api(`get/server/check`, {
        session: ''
    });
    if (res.status !== 401 || res.ok) {
        return `Expected 401, got ${JSON.stringify(res)}`;
    }

    return true;
});

Test.test('Smoke | Check performance of server', async api => {
    const n = 50;

    let res = await api(`get/server/performance`, {
        iterations: n
    });
    if (res.ok !== true) {
        return `performance test failed: ${JSON.stringify(res)}`;
    }

    console.log(c.yellow(`PERFORMANCE (${n}): ${(res.time / n).toFixed(3)}ms/req`));

    if (res.time > 500) {
        return `Server db connection performance test failed: ${JSON.stringify(res)}ms`;
    }

    res = await api(`get/server/performance`, {
        session: '',
        iterations: n
    });
    if (res.status !== 401 || res.ok || res.time) {
        return `Expected 401, got ${res}`;
    }

    return true;
});

Test.test('Smoke | 404', async api => {
    let res = await api('get/something-that-does-not-exist');
    if (res.status !== 404 || res.ok) {
        return `Expected 404, got ${JSON.stringify(res)}`;
    }

    return true;
});
