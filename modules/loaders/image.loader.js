// dependencies

var _ = require('lodash');
var Q = require('q');
var json2csv = require('json2csv');

var fileSystem = require('../common/fs');
var contentLoader = require('../loaders/content.loader');

// exports

module.exports = {
    load: _load
};

// initialization

// private methods

function _load(productsHashFileName, imageMapFileName) {

    var defaultTimeout = 1000;

    return fileSystem.readFile(productsHashFileName).then(function (productsString) {
        var imagesHash = {};

        var productsHash = JSON.parse(productsString);

        var productCounter = 0;

        var imgPromises = _.map(productsHash, function (product) {
            var name = product.img.replace(/\//g, '_');
            imagesHash[name] = product.title;

            var fileName = 'dist/images/' + product.brand + '/' + name;
            productCounter++;
            var deferred = Q.defer();

            setTimeout(function () {
                contentLoader.readOrDownloadAndSave(product.img, fileName, function (err, res) {
                    if (err) {
                        console.log('Error during loading of ' + product.ref);
                        deferred.reject(err);
                    }

                    console.log("image for " + product.ref + " was loaded");
                    deferred.resolve(res);
                });
            }, productCounter * defaultTimeout);

            return deferred.promise;
        });

        return fileSystem.writeFile(imageMapFileName, JSON.stringify(imagesHash)).then(function () {
            return Q.all(imgPromises);
        });
    });
}