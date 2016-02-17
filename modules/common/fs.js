// dependencies

var Q = require('q');
var fs = require('fs');

// exports

module.exports = {
    writeFile: _writeFile,
    readFile: _readFile,
    readOrCopy: _readOrCopy
};

// initialization

// private methods

function _writeFile(fileName, content) {
    var deferred = Q.defer();
    fs.writeFile(fileName, content, function (err, data) {
        if (err) return deferred.reject(err);

        deferred.resolve(data);
    });
    return deferred.promise;
}

function _readFile(fileName) {
    var deferred = Q.defer();
    fs.readFile(fileName, 'utf8', function (err, data) {
        if (err) {
            //console.log("File does not exist.");
            return deferred.reject(err);
        }

        //console.log("File is already exist. Won't download");
        deferred.resolve(data);
    });
    return deferred.promise;
}

function _readOrCopy(fileName, originalFileName, id) {
    return _readFile(fileName).then(function (data) {
    }, function () {
        var deferred = Q.defer();
        var readStream = fs.createReadStream(originalFileName);
        readStream.pipe(fs.createWriteStream(fileName)).on('close', function (err, res) {
            if (err) {
                console.log('Error during loading of ' + id);
                deferred.reject(err);
            }

            deferred.resolve(res);
        });
        return deferred.promise;
    });
}