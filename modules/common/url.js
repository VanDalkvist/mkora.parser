// dependencies

var _ = require('lodash');

// exports

module.exports = {
    createCodeFromUrl: _createCodeFromUrl
};

// initialization

// private methods

function _createCodeFromUrl(url, obj) {
    var refParts = _.filter(_.split(url, '/'));

    if (obj) {
        obj.breadcrumbs = _.mapValues(_.keyBy(refParts), function (part) {
            return {name: part};
        });
    }

    return _.join(refParts, '.');
}