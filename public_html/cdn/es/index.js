/** @typedef {import('entropy-script')} es */

const entropyScriptLink = document.createElement('script');

entropyScriptLink.setAttribute('src',
	'https://entropygames.io/entropy-script/node_modules/entropy-script/build/latest.js');

document.head.appendChild(entropyScriptLink);

entropyScriptLink.onload = async () => {

	window.runES = (text) => {
		es.run(text);
	};

	if ('onESLoad' in window && typeof window.onESLoad === 'function') {
		window.onESLoad(es);
	}

	const scripts = [
		...document.querySelectorAll('script[type=es]'),
		...document.querySelectorAll('script[type=entropy-script]')
	];

	const res = await es.init({
		print: console.log,
		input: (msg, cb) => cb(prompt()),
		node: false,
		path: window.location.href,
		libs: {

		}
	});

	es.parseConfig({
		permissions: {

		}
	})

	if (res instanceof es.Error) {
		console.error(res.str);
		return;
	}

	for (const s of scripts) {
		const url = s.getAttribute('src');

		let text;
		if (url) {
			text = await (await (fetch(url))).text();
		} else {
			text = s.innerText;
		}

		const env = new es.Context();
		env.parent = es.global;

		const res = es.run(text, {
			env,
			fileName: url || 'inline',
			currentDir: url
		});
		if (res.error) {
			console.error(res.error.str);
		}
	}
};