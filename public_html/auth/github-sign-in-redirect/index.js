request(`sign-in-with-github`, {
    code: urlParams.get('code')
}).then(res => {
    if (!res.id) {
        console.error('Invalid ID: ' + res.id);
        return;
    }
    localStorage.setItem('auth-id', res.id);
});