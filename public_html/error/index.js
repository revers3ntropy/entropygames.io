const cb = urlParams.get('cb');

window.goToCB = () => {
	window.location.href = decodeURIComponent(cb);
}

let message;
switch (urlParams.get('type')) {
	case 'notSignedIn':
		message = 'Looks like you need to sign in!';
		$('#options').html(`
                <div style="text-align: center; font-size: 30px; margin-top: 20px">

                </div>
            `);
		break;

	case 'accessDenied':
		message = "Sorry, you don't have access to that. ";
		break;

	case 'serverConnection':
		message = "Looks like we can't connect to the server right now... Try again in a few minutes";

		if (!cb) break;

		setInterval(async () => {
			const ping = await request('ping')
				.catch(()=>{});
			if (ping.ok)
				goToCB();
		}, 1000);

		break;
}

if (cb) {
	message += `
            <br><br>
    	    <button onclick="window.goToCB()" style="font-size: xx-large">
    	        Back
    	    </button>
    	`;
}

document.onload = () => void $('#error-message').html(message);