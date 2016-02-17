// dependencies

var _ = require('lodash');
var Q = require('q');
var fs = require('fs');
var easyImage = require('easyimage');

// exports

module.exports = {
    cropImagesFromDir: _cropImagesFromDir
};

// initialization

// private methods

function _cropImagesFromDir(src, dst) {
    var imagePaths = fs.readdirSync(src);

    return Q.all(_.map(imagePaths, function (imgPath) {
        var fileName = src + '/' + imgPath;
        var croppedFilePath = dst + '/' + imgPath;

        var deferred = Q.defer();

        easyImage.crop({
            src: fileName,
            dst: croppedFilePath,
            width: 647,
            height: 970,
            cropheight: 770,
            cropwidth: 647,
            gravity: "South"
        }).then(function (image) {
            console.log('Cropped: "' + imgPath + '" ' + image.width + ' x ' + image.height);
            deferred.resolve(image);
        }, function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    }));
}
