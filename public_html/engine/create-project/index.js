error = $('#error');
nameElement = $('#name');

document.addEventListener('keypress', () => {
    nameElement.val(nameElement.val() || '');
});

$(`#submit`).click(async () => {
    const name = (nameElement.val() || '').toString();

    if (name.length < 5) {
        error.html('Name must be longer than 4 character');
        return;
    }

    const id = await window.request('new-project', {name});

    window.location.href = 'https://entropyengine.dev/editor?p=' + id.projectID;
});