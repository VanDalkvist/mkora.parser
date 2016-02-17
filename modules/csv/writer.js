// dependencies

var Q = require('q');
var json2csv = require('json2csv');

var fileSystem = require('../common/fs');

// exports

module.exports = {
    write: _write
};

// initialization

// private methods

function _write(dstFileName, objects, fields, fieldNames) {
    var deferred = Q.defer();
    json2csv({data: objects, fields: fields, fieldNames: fieldNames}, function (err, csv) {
        if (err) return deferred.reject(err);

        fileSystem.writeFile(dstFileName, csv).then(function (res) {
            deferred.resolve(res);
        }, function (err) {
            deferred.reject(err);
        });
    });
    return deferred.promise;
}