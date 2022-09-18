const cb = window.urlParam('cb');

window.goToCB = () => {
    if (cb) {
        window.location.href = decodeURIComponent(cb);
    }
};


let message;
switch (window.urlParam('type')) {
    case 'notSignedIn':
        message = 'Looks like you need to sign in!';
        $('#options').html(`
                <div style="text-align: center; font-size: 30px; margin-top: 20px">
                    <a href="../sign-in">Sign In</a>
                    <a href="../new">Create Account</a>
                </div>
            `);
        break;


    case 'projectAccessDenied':
        message = "Sorry, you don't have access to that project. " +
            "<br>Try contacting whoever sent you the link and make sure you copied the whole link.";

        break;

    case 'serverPingFailed':
        message = "Looks like we can't connect to the server right now... Try again in a few minutes";

        if (!cb) break;

        setInterval(async () => {
            try {
                let response = await fetch(`https://entropyengine.dev:50001/ping`, {
                    method: 'POST',
                    body: '{}'
                }).catch(() => {});

                if (!response) {
                    return;
                }

                let ping = await response.json().catch(() => {});
                if (ping.ok) {
                    window.goToCB();
                }

            } catch (E) {}

        }, 1000);


        break;

    case 'buildPlayFail':
        message = `That project either doesn't exist, hasn't been built or you don't have access to it.`;
        break;

    default:
        message = 'Looks like theres been an error... try signing in again';
        break
}

if (cb) {
    message += `
        <br><br>
        <button onclick="window.goToCB()" style="font-size: xx-large">
            Back
        </button>
    `;
}

$('#error-message').html(message);
