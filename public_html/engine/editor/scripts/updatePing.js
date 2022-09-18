async function updatePing () {
	const startTime = performance.now();

	let response = await window.request('ping');

	if (!response.ok) {
		console.error('Server ping failed');
		return;
	}

	const time = performance.now() - startTime;

	$('#ping').html(Math.floor(time).toFixed(2));
}

setInterval(updatePing, 2000);
updatePing();