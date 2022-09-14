const { run, init, str } = es;
const input = $('#input');
const output = document.getElementById('output');
const submit = $('#submit');

const perfTestButton = $('#perf-test');

(async () => {
	await init({
		print: outputFunc,
		input: () => outputFunc('This does not support the input function.'),
		node: false
	});

	input.val(localStorage.ES_IDE_TEXT ?? `print('hello world');`);
})()

function outputFunc (message) {
	const messageP = document.createElement('p');
	messageP.innerHTML = str(message);
	output.appendChild(messageP);
}

submit.click(async () => {
	output.innerHTML = '';
	const res = run(input.val(), {
		measurePerformance: true
	})
	if (res.error) {
		outputFunc(res.error.str);
	}
});

const nIterations = 10;

perfTestButton.click(() => {
	output.innerHTML = '';
	const msg = input.val();
	let totalTime = 0;
	for (let i = 0; i < nIterations; i++) {
		let res = run(msg);
		if (res.error) outputFunc(res.error.str);
		totalTime += res.timeData.total;
	}
	const finalOut = `${nIterations} iterations took an average of ${Number((totalTime / nIterations).toPrecision(2))}ms`;
	outputFunc(finalOut);
	console.log(finalOut);
});

function saveToLS() {
	localStorage.ES_IDE_TEXT = input.val();
}

input.change(saveToLS);
input.keydown(saveToLS);