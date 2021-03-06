'use strict';

var prettyBytes = require('pretty-bytes');
var chalk = require('chalk');
var utils = require('./lib/utils');

var averageImagesPerPage = 1200000;

exports.init = function() {
    var threshold = 70;
    var exports = {};
    var verbose = '';

    var generateScore = function(url, strategy, score) {
        var color = utils.scoreColor(score);

        score = 'Score:     ' + color(score);
        url = 'URL:       ' + chalk.cyan(url);
        strategy = 'Strategy:  ' + chalk.cyan(strategy);

        return [url, score, strategy].join('\n') + '\n';
    };

    var generateRuleSetResults = function(rulesets) {
        var result, ruleImpact, title;
        var _results = [];

        for (title in rulesets) {
            result = rulesets[title];
            ruleImpact = Math.ceil(result.ruleImpact * 100) / 100;
            _results.push(utils.labelize(title) + chalk.cyan(ruleImpact));
        }

        return _results.join('\n');
    };

    var generateStatistics = function(statistics) {
        var result, title;
        var _results = [];

        for (title in statistics) {
            result = title.indexOf('Bytes') !== -1 ?
                prettyBytes(+statistics[title]) :
                statistics[title];

            _results.push(utils.labelize(title) + chalk.cyan(result));
        }

        return _results.join('\n');
    };

    exports.threshold = function(limit) {
        threshold = limit;
        return threshold;
    };

    exports.process = function(parameters, response, done) {
        var logger = console.log,
            error = null;

        done = done || function() {};
        threshold = parameters.threshold || threshold;
        verbose = parameters.verbose;

        var yourImageWeight = parseInt(response.pageStats.imageResponseBytes || 0, 10);
        var unoptimizedImages = response.formattedResults.ruleResults.OptimizeImages.urlBlocks;
        var shave = chalk.cyan("Thanks for keeping the web fast <3");
        var imagesToOptimize = "";

        if (yourImageWeight > averageImagesPerPage) {
            shave = chalk.cyan('Please shave off at least:\n') + prettyBytes(yourImageWeight - averageImagesPerPage);

            if (verbose) {
                if (unoptimizedImages[1] !== undefined) {
                    unoptimizedImages[1].urls.forEach(function(url) {
                        url.result.args.forEach(function(x) {
                            var result = "";
                            switch (x.type) {
                                case 'URL':
                                    result += chalk.green(x.value);
                                    break;
                                case 'BYTES':
                                    result += 'Size: ' + chalk.red(x.value);
                                    break;
                                case 'PERCENTAGE':
                                    result += 'Can be improved by ' + chalk.yellow(x.value);
                                    break;
                            }
                            imagesToOptimize += result + '\n';
                        });
                    });
                }
            }
        }

        logger([
            chalk.cyan('Your image weight:\n') + prettyBytes(yourImageWeight),
            chalk.cyan('Average image weight on the web:\n') + prettyBytes(averageImagesPerPage),
            shave,
            imagesToOptimize.length ? (chalk.underline('\nImages to optimize:\n') + imagesToOptimize + chalk.cyan('\nThis list does not include images which cannot be optimized further.\nYou may consider removing those images if possible.')) : '',
        ].join('\n'));

        if (response.score < threshold) {
            error = new Error("Threshold of " + threshold + " not met with score of " + response.score);
        }

        return done(error);
    };

    return exports;
};
