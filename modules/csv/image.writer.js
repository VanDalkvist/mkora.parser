// dependencies

var _ = require('lodash');

var csvWriter = require('../csv/writer');
var fileSystem = require('../common/fs');
var imageMapping = require('../mappings/image.mapping');

// exports

module.exports = {
    write: _write
};

// initialization

// private methods

function _write(productsHashFileName, imagePrefix, dstFileName) {
    var productsPromise = fileSystem.readFile(productsHashFileName);

    return productsPromise.then(function (productsString) {
        var productsHash = JSON.parse(productsString);

        var products = _.map(productsHash, function (product) {
            var name = product.img.replace(/\//g, '_');

            var images = imagePrefix + product.brand + '/' + name;

            return {title: product.title, images: images, brand: product.brand, globalType: "Косметика"};
        });

        var fields = imageMapping.fields;

        var fieldNames = imageMapping.fieldNames;

        return csvWriter.write(dstFileName, products, fields, fieldNames);
    });
}