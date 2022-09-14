const state = randomString(randomInt(10, 20));
sessionStorage.setItem('github-oauth-state-temp', state);
// feels wrong to have an id hard coded, but I think this is right
const clientID = '5e0bcd5bc1ba2bd2f4f4';
const redirect = 'https%3A%2F%2Fentropygames.io%2Fauth%2Fgithub-sign-in-redirect';

$('#githubsignin').attr('href',
    `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirect}&state=${state}`);