export function outputFunc (m) {
	R.update('esPlaygroundLogs', logs => [m, ...logs]);
}

export async function execute () {
	R.set({ esPlaygroundLogs: [] });

	if (!!R.get('esPlaygroundCompile')) {
		outputFunc('Open the dev tools console to see output');
	}

	const env = new es.Context();
	env.parent = es.global;

	const res = es.run(R.get('esPlayGroundCode'), {
		measurePerformance: true,
		env,
		compileToJS: !!R.get('esPlaygroundCompile')
	})
	if (res.error) {
		outputFunc(res.error.str);
	}
}

export function perfTest () {
	R.set({ esPlaygroundLogs: [] });
	console.log('running');

	const nIterations = parseInt(R.get('esPlaygroundIterations'));
	if (isNaN(nIterations)) {
		outputFunc('Invalid number of iterations');
		return;
	}

	let totalTime = 0;

	const start = performance.now();

	console.log(nIterations);
	for (let i = 0; i < nIterations; i++) {
		const iterStart = performance.now();

		const env = new es.Context();
		env.parent = es.global;

		let res = es.run(R.get('esPlayGroundCode'), {
			env,
			measurePerformance: true,
			compileToJS: !!R.get('esPlaygroundCompile')
		});

		if (res.error) {
			outputFunc(res.error.str);
			return;
		}

		totalTime += performance.now() - iterStart;
	}
	const end = performance.now();
	const average = Number((totalTime / nIterations).toPrecision(3));
	const finalOut = `${nIterations} iterations took an average of ${average}ms (total: ${(end-start).toPrecision(3)}ms)`;
	console.log(finalOut);
	outputFunc(finalOut);
}