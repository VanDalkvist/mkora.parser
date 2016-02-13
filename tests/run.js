var superTest = require('supertest');
var chai = require('chai');
var _ = require('lodash');
var Q = require('q');
var fs = require('fs');
var cheerio = require('cheerio');

var assert = chai.assert;
var should = chai.should();
var expect = chai.expect;

var config = require('../settings/config.json');

var site = config.site;
console.log('Site to parse: ', site);

var request = superTest(site);

var mainPageParser = require('../modules/parsers/main-page.parser');

describe('Parsing site... ', function () {

    var $, context = {fileContent: null};

    before("read file '" + 'dist/' + config.file + "' if exist", function (done) {

        _makeDir('dist').then(function () {
            return Q.all([_makeDir('dist/categories'), _makeDir('dist/products')]);
        }).then(function () {
            _readFile('dist/' + config.file).then(function (data) {
                context.fileContent = data;
                done();
            }, function () {
                done();
            });
        });
    });

    it('respond with whole page', function (done) {
        if (context.fileContent) {
            $ = mainPageParser.parse(context.fileContent);
            return done();
        }

        console.log("Main html file does not exist. Need to download.");

        _prepareRequest(request.get('/'))
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);

                var fileName = 'dist/' + config.file;

                _writeFile(fileName, res.text).then(function () {
                    $ = mainPageParser.parse(res.text);

                    assert.notEqual($, null);
                    assert.notEqual($, undefined);

                    done();
                }, function (err) {
                    done(err);
                });
            });
    });

    it('html should successfully parsed as cheerio object', function (done) {
        expect($('ul.accordion').html()).to.exist;

        done();
    });

    var categories;

    it('should parse all categories', function () {
        categories = $('ul.accordion li a');

        console.log('Categories count - ', categories.length);

        expect(categories.html()).not.to.be.empty;

        // todo: add title and description

        categories = categories.map(function (i, cat) {
            return $(cat).attr('href');
        }).toArray();

        expect(categories).not.to.be.empty;
    });

    var categoriesToGrab = [];

    var categoryCodes = [
        'kosmetika-kora',
        'new-line-prof-linija',
        'new-line-domashnij-uhod',
        'sante_qj',
        'izrailskaja-kosmetika'
    ];

    _.each(categoryCodes, function (code) {
        it('should parse "' + code + '" categories links', function () {
            var categoryRef = '/' + code + '/';

            var filtered = _filterCategories(categories, categoryRef);
            categoriesToGrab.push({categories: filtered, ref: categoryRef, code: code});
        });
    });

    var categoryPagesPromise;

    it('should load all categories page', function (done) {
        var toGrabPromises = categoriesToGrab.map(function (cat) {
            return _makeDir('dist/categories/' + cat.code).then(function () {
                return _mapCategory(cat);
            });
        }, []);

        categoryPagesPromise = Q.all(toGrabPromises).then(function (res) {
            console.log('good!');
            done();
            return res;
        }, function (err) {
            done(err);
        }).catch(function (err) {
            done(err);
        });
    });

    it('should parse products', function (done) {
        categoryPagesPromise.then(function (rootCategories) {
            var compiled = _.map(rootCategories.map(function (categories) {
                return Q.all(categories.map(function (category) {
                    var breadcrumbs = _.filter(category.ref.split('/'));
                    var promise = breadcrumbs.reduce(function (prev, name) {
                        return prev.then(function (prevName) {
                            return _makeDir('dist/products/' + prevName + '/' + name).then(function () {
                                return prevName + '/' + name;
                            });
                        });
                    }, Q.when(''));

                    return promise.then(function () {
                        var $ = cheerio.load(category.page);

                        var productsList = $('#product-list .products-list').html();

                        var isEmpty = _.isEmpty(productsList);
                        //

                        if (isEmpty) {
                            console.log(category.ref + " - category is empty. Skipping... ");
                            return { ref: category.ref, products: [] };
                        }

                        expect($('#product-list .products-list ul')).to.have.length(1);
                        expect($('#product-list .products-list ul li')).not.to.be.empty;
                    });
                }));
            }));

            Q.all(compiled).then(function (res) {
                done();
            }, function (err) {
                done(err);
            }).catch(function (err) {
                done(err);
            });
        });
    });

    // private functions

    function _prepareRequest(request) {
        return request
            .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8')
            .set('Accept-Encoding', 'gzip, deflate, sdch')
            .set('Accept-Language', 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4,es;q=0.2');
    }

    function _filterCategories(categories, categoryName) {
        var hrefs = categories.filter(function (ref) {
            return ref !== categoryName && ref.indexOf(categoryName) > -1;
        });

        console.log("'" + categoryName + "' categories count - ", hrefs.length);

        return hrefs;
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

    function _writeFile(fileName, content) {
        var deferred = Q.defer();
        fs.writeFile(fileName, content, function (err, data) {
            if (err) return deferred.reject(err);

            deferred.resolve(data);
        });
        return deferred.promise;
    }

    function _mapCategory(cat) {
        console.log("'" + cat.ref + "' category pages to grab: ", cat.categories.length);
        return Q.all(cat.categories.map(function _mapCategoryLink(categoryRef) {
            var deferred = Q.defer();

            _prepareRequest(request.get(categoryRef))
                .expect(200)
                .end(function (err, res) {
                    if (err) return deferred.reject(err);

                    var name = categoryRef.replace(/\//g, '_');
                    var fileName = 'dist/categories/' + cat.code + '/' + name + '.html';
                    _readOrWriteAndResolve(fileName, res.text, deferred, function (data) {
                        return {code: cat.code, ref: categoryRef, page: data};
                    });
                });

            return deferred.promise;
        }));
    }

    function _readOrWriteAndResolve(fileName, content, deferred, mapper) {
        return _readFile(fileName).then(function (data) {
            return deferred.resolve(mapper ? mapper(data) : data);
        }, function () {
            return _writeFile(fileName, content).then(function () {
                console.log('File was written. ', fileName);
                deferred.resolve(mapper ? mapper(content) : content);
            }, function (err) {
                console.log('Error during writing... ', err);
                deferred.reject(err);
            }).catch(function (err) {
                console.log('Unhandled error: ', err);
                deferred.reject(err);
            });
        });
    }

    function _makeDir(name) {
        var deferred = Q.defer();

        try {
            fs.mkdirSync(name);
            deferred.resolve();
        } catch (e) {
            if (e.code != 'EEXIST') return deferred.reject(e);
            deferred.resolve();
        }

        return deferred.promise;
    }

});