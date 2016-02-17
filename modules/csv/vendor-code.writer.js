// dependencies

var _ = require('lodash');

var fileSystem = require('../common/fs');
var csvWriter = require('../csv/writer');
var codeMapping = require('../mappings/vendor-code.mapping');

// exports

module.exports = {
    write: _write
};

// initialization

// private methods

function _write(productsHashFileName, dstFileName, relations) {
    return fileSystem.readFile(productsHashFileName).then(function (productsString) {
        var productsHash = JSON.parse(productsString);

        var products = _.map(productsHash, function (product) {
            var code = product.vendor + "-code";
            return {title: product.title, vendorCode: relations[code]};
        });

        var fields = codeMapping.fields;
        var fieldNames = codeMapping.fieldNames;

        return csvWriter.write(dstFileName, products, fields, fieldNames);
    });
}