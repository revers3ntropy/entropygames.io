projectID = window.urlParam('p') || '0';
let confirmButton = $('#confirm');

window.apiToken.project = parseInt(projectID);

window.request('get-project-name').then(async value => {
    confirmButton.html(`
            <p style="font-size: 30px">
                Are you sure you want to delete the project
                <a href="../../editor?p=${projectID}">
                    ${value.name}
                </a>?
            </p>
        `);

    $('#timer').css('animation', 'timer-shrink 2000ms ease');

    await window.sleep(2000);

    window.delete = () => {
        window.request('delete-project');
        window.location.href = 'https://entropyengine.dev/accounts/my-projects';
    };

    confirmButton.append(`
        <br>
        <button onclick="window.delete()" style="font-size: 20px">
            Yes
        </button>
    `);

});