// dependencies

var request = require('request');
var fs = require('fs');

var fileSystem = require('../common/fs');

// exports

module.exports = {
    downloadAndSave: _downloadAndSave,
    readOrDownloadAndSave: _readOrDownloadAndSave
};

// initialization

// private methods

function _downloadAndSave(uri, fileName, callback) {
    request.head(uri, function (err, res) {
        if (err) return callback(err);

        //console.log('content-type:', res.headers['content-type']);
        //console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(fileName)).on('close', callback);
    });
}

function _readOrDownloadAndSave(uri, fileName, callback) {
    try {
        fs.accessSync(fileName);
        return fileSystem.readFile(fileName).then(function (res) {
            callback(null, res);
        }, callback);
    }
    catch (e) {
        _downloadAndSave('http://' + config.site + uri, fileName, callback);
    }
}