// dependencies

var fs = require('fs');
var Q = require('q');
var _ = require('lodash');
var easyImage = require('easyimage');

var fileSystem = require('../modules/common/fs');
var contentLoader = require('../modules/loaders/content.loader');

// initialization

describe.skip('Loading image test', function () {

    before("create images dir", function () {
        return fileSystem.makeDir('dist/images');
    });

    var testImageUrl = 'http://www.mkora.ru/wa-data/public/shop/products/86/06/686/images/1331/1331.970.jpg';

    var originalFileName = 'dist/images/test.jpg';

    var copyFileName = 'dist/images/test_copy.jpg';

    // disabled test
    it('should download image', function (done) {
        contentLoader.downloadAndSave(testImageUrl, originalFileName, function (err) {
            if (err) return done(err);

            console.log('very good!');
            done();
        });
    });

    it("should copy image", function (done) {
        fileSystem.readOrCopy(copyFileName, originalFileName, copyFileName).then(function (err) {
            if (err) return done(err);

            console.log("Copied successfully.");
            done();
        });
    });

    it.skip("should crop image", function (done) {
        var croppedFileName = 'dist/images/test_copy_crop.jpg';

        easyImage.crop({
            src: copyFileName,
            dst: croppedFileName,
            width: 647,
            height: 970,
            cropheight: 770,
            cropwidth: 647,
            //quality: 1,
            gravity: "South"
        }).then(function (image) {
            done();
            console.log('Cropped: ' + image.width + ' x ' + image.height);
        }, function (err) {
            //console.log(err);
            done(err);
        });
    });

    it.skip("should crop all files from directory", function () {
        var dir = 'dist/images';
        var images = fs.readdirSync(dir);

        return Q.all(_.map(images, function (imgPath) {

            var fileName = dir + '/' + imgPath;
            var croppedFileName =
                dir + '/'
                + path.basename(imgPath, path.extname(imgPath))
                + '_crop' + path.extname(imgPath);

            console.log("imgPath: " + imgPath);
            console.log("copyFileName: " + fileName);
            console.log("croppedFileName: " + croppedFileName);

            var deferred = Q.defer();

            easyImage.crop({
                src: fileName,
                dst: croppedFileName,
                width: 647,
                height: 970,
                cropheight: 770,
                cropwidth: 647,
                gravity: "South"
            }).then(function (image) {
                console.log('Cropped: ' + image.width + ' x ' + image.height);
                deferred.resolve(image);
            }, function (err) {
                deferred.reject(err);
            });

            return deferred.promise;
        }));
    });



});

// private methods