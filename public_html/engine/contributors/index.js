import * as Chartist from 'chartist';

const currentTime = Math.round(new Date().getTime()/1000);

fetch(`https://entropyengine.dev:50001/all-contributions/${window.urlParam('p')}`)
    .then(async (data: any) => {
        data = await data.json();

        if (data.length < 1) return;

        let leastRecent = Math.floor(data[0].date / (60*60*24));
        let mostRecent = 0;
        let max = 0;

        let series = [];

        let perPersonSeries: any = {};

        for (const save of data) {
            const secondsSince = currentTime - save.date;
            const daysSince = Math.floor(secondsSince / (60*60*24));

            if (daysSince > leastRecent) {
                leastRecent = daysSince;
            }

            if (daysSince < mostRecent) {
                mostRecent = daysSince;
            }

            if (series[daysSince]) {
                series[daysSince] += 1;
            } else {
                series[daysSince] = 1;
            }

            if (!perPersonSeries[save.username]) {
                perPersonSeries[save.username] = [];
            }

            if (perPersonSeries[save.username][daysSince])
                perPersonSeries[save.username][daysSince] += 1;
            else {
                perPersonSeries[save.username][daysSince] = 1;
            }
        }

        // find max
        for (let day of series) {
            if (day > max)
                max = day;
        }

        series.reverse();

        new Chartist.Line('#chart-total', {series: [series]}, {
            showPoint: false,
            showArea: true,
            showLine: false,

            axisX: {
                showLabel: true,
                showGrid: true,
            },
            axisY: {
                offset: 50,
                showGrid: false,
            },

            lineSmooth: Chartist.Interpolation.simple({
                divisor: 2,
            }),
            high: max,
            low: 0,
        });

        async function doForPeople () {
            if (!window.loadedPeople){
                await window.sleep(0.1);
                doForPeople();
                return;
            }

            for (const person in perPersonSeries) {
                let max = 0;

                for (let day of perPersonSeries[person]) {
                    if (day > max)
                        max = day;
                }

                perPersonSeries[person].reverse();

                new Chartist.Line(`#chart-${person}`, {series: [perPersonSeries[person]]}, {
                    showPoint: false,
                    showArea: true,
                    showLine: false,

                    axisX: {
                        showLabel: true,
                        showGrid: true,
                    },
                    axisY: {
                        offset: 50,
                        showGrid: false,
                    },

                    lineSmooth: Chartist.Interpolation.simple({
                        divisor: 2,
                    }),
                    high: max,
                    low: 0,
                });
            }

            window.scrollTo(0, 0);
        }

        doForPeople();

    });
