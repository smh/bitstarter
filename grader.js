#!/usr/bin/env/node
/*
 * Automatically grade files for the presence of specified HTML tags/attributes.
 * Uses commander.js and cheerio. Teaches command line application development
 * and basic DOM parsing.
 *
 * References:
 *
 *  + cheerio
 *    - https://github.com/MatthewMueller/cheerio
 *    - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
 *    - http://maxogden.com/scraping-with-node.html
 *
 *  + commander.js
 *    - https://github.com/visionmedia/commander.js
 *    - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy
 *
 *  + JSON
 *    - http://en.wikipedia.org/wiki/JSON
 *    - https://developer.mozilla.org/en-US/docs/JSON
 *    - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firfox_2
 */


var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var HTMLFILE_DEFAULT = 'index.html';
var CHECKSFILE_DEFAULT = 'checks.json';
var restler = require('restler');

var assertFileExists = function(infile) {
  var instr = infile.toString();
  if (!fs.existsSync(instr)) {
    console.log("%s does not exist. Exiting.", instr);
    process.exit(1); // http://nodejs.org/ap/process.html#process_process_exit_code
  }
  return instr;
};

var cheerioCallback = function(fn) {
  return function(err, data) {
    if (err) {
      return fn(err);
    }
    return fn(null, cheerio.load(data));
  };
};

var restlerCallback = function(url, fn) {
  restler.get(url)
         .on('complete', function(result) {
           if (result instanceof Error) {
             return fn(result);
           }
           return fn(null, result);
         });
};

var cheerioHtmlFile = function(htmlfile, url, fn) {
  if (url) {
    restlerCallback(url, cheerioCallback(fn));
  } else {
    fs.readFile(htmlfile, cheerioCallback(fn));
  }
};

var loadChecks = function(checksfile, fn) {
  fs.readFile(checksfile, function(err, data) {
    if (err) {
      return fn(err);
    }
    return fn(null, JSON.parse(data));
  });
};

var checkHtmlFile = function(htmlfile, checksfile, url, fn) {
  cheerioHtmlFile(htmlfile, url, function(err, $) {
    if (err) {
      return err;
    }
    loadChecks(checksfile, function(err, checks) {
      if (err) {
        return fn(err);
      }
      checks = checks.sort();
      var out = {};
      for (var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
      }
      return fn(null, out);
    });
  });
};

var clone = function(fn) {
  // Workaround for commander.js issue
  // http://stackoverflow.com/a/6772648
  return fn.bind({});
};

if (require.main == module) {
  program
    .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
    .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
    .option('-u, --url <html_url>', 'Url to index.html')
    .parse(process.argv);

  checkHtmlFile(program.file, program.checks, program.url, function(err, out) {
    if (err) {
      console.log(err);
    } else {
      console.log(JSON.stringify(out, null, 4));
    }
  });
} else {
  exports.checkHtmlFile = checkHtmlFile;
}
