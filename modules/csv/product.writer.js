// dependencies

var _ = require('lodash');

var fileSystem = require('../common/fs');
var csvWriter = require('../csv/writer');
var productMapping = require('../mappings/product.mapping');

// exports

module.exports = {
    write: _write
};

// initialization

// private methods

function _write(productArrayFileName, productsHashFileName, dstFileName) {

    return fileSystem.readFile(productsHashFileName)
        .then(function (productsHash) {
            return _.map(productsHash, function (product) {
                product.type = _setMany(product.types);
                product.skin = _setMany(product.skin);

                var isFace = _.includes(product.categoryCodes, 'dlya-litsa', _addQuotes);

                product['for-face'] = isFace ? _setMany(product.categories) : '';

                var isHairs = _.includes(product.categoryCodes, 'dlya-volos', _addQuotes);

                product['for-hairs'] = isHairs ? _setMany(product.categories) : '';

                var isBody = _.includes(product.categoryCodes, 'dlya-tela', _addQuotes);

                product['for-body'] = isBody ? _setMany(product.categories) : '';

                product.currency = 'RUB';
                product.access = 1;
                product.status = 1;
                product.globalType = 'Косметика';

                return product;
            });
        }).then(function (products) {
            return fileSystem.writeFile(productArrayFileName, JSON.stringify(products)).then(function () {
                var fields = productMapping.fields;
                var fieldNames = productMapping.fieldNames;
                return csvWriter.write(dstFileName, products, fields, fieldNames);
            });
        });
}

function _setMany(arr, wrap) {
    var val;

    if (!arr || arr.length === 0) {
        val = '';
    }
    else if (arr.length === 1) {
        val = arr[0];
    } else {
        var values = wrap ? _.map(arr, wrap) : arr;
        val = '{' + _.join(values, ',') + '}';
    }

    return val;
}

function _addQuotes(item) {
    return '"' + item + '"';
}