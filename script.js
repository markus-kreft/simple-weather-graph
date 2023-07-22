function weather(data, city) {
    var date = '';
    var labels = [];
    var temperature = [];
    var symbols = [];
    var precipitation = [];
    var x, i, xmlDoc, from;
    var dt = new Date(data.properties.meta.updated_at);
    date = dt.getDate() + '.' + (dt.getMonth()+1) + '.' + dt.getFullYear() + ' ' + dt.getHours() + ':' + dt.getMinutes();

    // get data
    x = data.properties.timeseries;
    for (i=0; i<x.length; i++) {
        // temperatures are given every hour at the hour
        // precipitation and weather symbol is given for a timespan of an hour
        from = new Date(x[i].time);
        if (i%2==1){
            labels.push( ('0' + from.getHours()).slice(-2))
        } else {
            labels.push('')
        }
        temperature.push(parseFloat(x[i].data.instant.details.air_temperature));
        precipitation.push(
            // i*0.1
            x[i].data.next_1_hours.details.precipitation_amount
        );
        symbols.push( x[i].data.next_1_hours.summary.symbol_code);
        if ( symbols.length == 24) {
            break;
        }
    }

    // HACK: calculate temperature corresponding to precipitation as mean between two hours and hope for the best...
    for (i=0; i<temperature.length-1; i++) {
        temperature[i] = (temperature[i]+temperature[i+1]) / 2;
    }

    // offset symbols
    var symbolpositions = [];
    var offset = 0.15 * (Math.max.apply(Math, temperature) - Math.min.apply(Math, temperature))
    for (i=0; i<temperature.length - 1; i++) {
        symbolpositions.push(temperature[i] + offset + 0.5*Math.abs(temperature[i]-temperature[i+1]));
    }

    // set title and favicon
    document.title = "Weather " + city;
    var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = './icons/' + symbols[0] + '.png';
    document.getElementsByTagName('head')[0].appendChild(link);

    // get symbol icons
    var icons = [];
    for (i=0; i<symbols.length;i++) {
        if (i % 2 === 0) {
            var myImage = new Image();
            myImage.src = './icons/' + symbols[i] + '.png';
            icons.push(myImage);
        } else {
            icons.push('');
        }
    }

    // draw chart
    Chart.defaults.global.defaultFontSize = 20;
    new Chart(document.getElementById('chart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                yAxisID: 'A',
                pointStyle: icons,
                label: 'symbol',
                type: 'line',
                data: symbolpositions,
                borderColor: 'rgb(0,0,0,0)',
                fill: false,
                }, {
                yAxisID: 'A',
                label: 'temperature',
                type: 'line',
                data: temperature,
                borderColor: '#bbbbbbff',
                fill: false,
                }, {
                yAxisID: 'B',
                label: 'precipitation',
                type: 'bar',
                backgroundColor: '#76d0f0aa',
                data: precipitation,
                }
            ]
        },
        options: {
            scales: {
                xAxes: [{
                    ticks: {
                        // hide original x labels, we draw them later manually
                        fontColor: "transparent",
                    },
                    // categoryPercentage: 1.15,
                    gridLines: {
                        color: "#ffffff44",
                        // shift grid lines between datapoints (== at the hours)
                        offsetGridLines: true
                    }
                }],
                yAxes: [{
                    id: 'A',
                    type: 'linear',
                    position: 'left',
                    scaleLabel: {
                        display: true,
                        labelString: 'temperature / °C'
                    },
                    gridLines: { display:false },
                    ticks: {
                        // use `min' to make it strict but that messes with auto axex label selection
                        sugestedMin: Math.floor(Math.min.apply(Math, temperature) - 0.01 * (Math.max.apply(Math, temperature) - Math.min.apply(Math, temperature))),
                        sugestedMax: Math.ceil(Math.min.apply(Math, symbolpositions))
                    },
                }, {
                    id: 'B',
                    type: 'linear',
                    position: 'right',
                    scaleLabel: {
                        display: true,
                        labelString: 'precipitation / mm'
                    },
                    gridLines: { color: "#ffffff44" },
                    ticks: {
                        beginAtZero: true,
                        steps: 8,
                        stepValue: 1,
                        max: 8
                    },
                }]
            },
            elements: {
                point: {
                    radius: 0,
                    hitRadius: 0,
                    hoverRadius: 0,
                }
            },
            title: {
                display: true,
                text: city + ', ' + date + ', Weather forecast from Yr, delivered by the Norwegian Meteorological Institute and NRK'
            },
            legend: { display: false }
        },
        plugins: [{
            // shift hour labels to correspond to the full hours == in between precipitation values
            beforeDraw: function(chart) {
                var ctx = chart.ctx;
                var xAxis = chart.scales['x-axis-0'];
                var tickGap = xAxis.getPixelForTick(1) - xAxis.getPixelForTick(0);
                // xAxis.options.ticks.fontColor = 'transparent'; // hide original tick
                Chart.helpers.each(xAxis.ticks, function(tick, index) {
                    if (index === xAxis.ticks.length) return;
                    var xPos = xAxis.getPixelForTick(index);
                    var yPos = xAxis.bottom;
                    var yPadding = 0;
                    ctx.save();
                    ctx.textBaseline = 'bottom';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#ffffff44';
                    ctx.fillText(tick, xPos-tickGap/2, yPos+yPadding);
                    ctx.restore();
                });
            }
        }],
    });
}

// var url = './forecast.json';
var xmlhttp = new XMLHttpRequest();
xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        var data = JSON.parse(this.responseText);
        weather(data, city);
    }
};
xmlhttp.open('GET', url);
xmlhttp.send();
