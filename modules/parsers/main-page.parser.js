// dependencies

var cheerio = require('cheerio');

// exports

module.exports = {
    parse: _parse
};

// initialization

// private methods

function _parse(htmlPage) {
    return cheerio.load(htmlPage);
}