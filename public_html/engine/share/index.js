import {} from '../../types/types';

const errorDIV = $('#error');
const projectID = window.urlParam('p');
$('back').attr('href', (_, v) => v + projectID);
$('see-contributors').attr('href', (_, v) => v + projectID);

window.apiToken.project = parseInt(projectID || '0');

const usernameElement = $('#username');
const accessElement = $('#access');

$(`#submit`).click(async () => {
    const username = usernameElement.val();
    const accessLevel = accessElement.val();

    if (username) {
        const usernameExists = await window.request('username-exists', {
            username: username
        });
        if (usernameExists.exists !== '1') {
            errorDIV.html('That username doesn\'t seem to exist exists');
            return;
        }
    }
    let {error} = await window.request('share-project', {
        username,
        accessLevel
    });
    window.location.href = error ? `../accounts/error` : `../editor`;
});