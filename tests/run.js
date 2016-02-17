var superTest = require('supertest');
var chai = require('chai');
var _ = require('lodash');
var Q = require('q');
var fs = require('fs');
var cheerio = require('cheerio');
var entities = require('entities');
var request = require('request');
var path = require('path');

var assert = chai.assert;
var should = chai.should();
var expect = chai.expect;

var config = require('../settings/config.json');
var urlUtils = require('../modules/common/url');
var fileSystem = require('../modules/common/fs');
//var contentLoader = require('../modules/loaders/content.loader');

var productSearcher = require('../modules/parsers/product.searcher');
var configuration = require('../modules/settings/configuration');
var mappings = require('../modules/mappings/mappings');

var site = config.site;
console.log('Site to parse: ', site);

var loader = superTest(site);

var mainPageParser = require('../modules/parsers/main-page.parser');

describe("Parsing site... ", function () {

    var $, context = {fileContent: null};

    var productsHashFileName = 'dist/json/products.json';

    before("read file '" + 'dist/' + config.file + "' if exist", function (done) {

        fileSystem.makeDir('dist').then(function () {
            return Q.all([
                fileSystem.makeDir('dist/categories'),
                fileSystem.makeDir('dist/images'),
                fileSystem.makeDir('dist/site-images'),
                fileSystem.makeDir('dist/products').then(function () {
                    return Q.all([
                        fileSystem.makeDir('dist/products/biokosmetika-kora-organic'),
                        fileSystem.makeDir('dist/products/kosmetika-kora/').then(function () {
                            return fileSystem.makeDir('dist/products/kosmetika-kora/ezhednevnyj-uhod-za-volosami');
                        })
                    ]);
                })
            ]);
        }).then(function () {
            fileSystem.readFile('dist/' + config.file).then(function (data) {
                context.fileContent = data;
                done();
            }, function () {
                done();
            });
        });
    });

    describe.skip("Parse page for categories", function () {

        it('respond with whole page', function (done) {
            if (context.fileContent) {
                $ = mainPageParser.parse(context.fileContent);
                return done();
            }

            console.log("Main html file does not exist. Need to download.");

            _prepareRequest(loader.get('/'))
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);

                    var fileName = 'dist/' + config.file;

                    fileSystem.writeFile(fileName, res.text).then(function () {
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

        var categoriesHash = {};

        _.each(categoryCodes, function (code) {
            it('should parse "' + code + '" categories links', function () {
                var categoryRef = '/' + code + '/';

                var filtered = _filterCategories(categories, categoryRef);
                categoriesToGrab.push({categories: filtered, ref: categoryRef, code: code});

                // exceptions
                if (code === 'kosmetika-kora') {
                    filtered.push('/biokosmetika-kora-organic/');
                    filtered.push('/kosmetika-kora/ezhednevnyj-uhod-za-volosami/');
                }

                categoriesHash[code] = {
                    code: code,
                    ref: categoryRef,
                    sub: filtered
                };
            });
        });

        var categoryPagesPromise;

        describe("Parse products and save to json and CSV", function () {

            var productWriter = require('../modules/csv/product.writer');

            it('should load all categories page', function (done) {

                var toGrabPromises = _.mapValues(categoriesHash, function (cat) {
                    return fileSystem.makeDir('dist/categories/' + cat.code).then(function () {
                        return Q.each({
                            code: cat.code,
                            ref: cat.ref,
                            sub: cat.sub,
                            pages: _mapCategory(cat)
                        });
                    });
                }, []);

                categoryPagesPromise = Q.each(toGrabPromises).then(function (res) {
                    console.log('good!');
                    done();
                    categoriesHash = res;
                }, function (err) {
                    done(err);
                }).catch(function (err) {
                    done(err);
                });
            });

            before("should create directories for products", function () {
                return _.map(categoriesHash, function (cat) {
                    var breadcrumbs = _.filter(cat.ref.split('/'));
                    return breadcrumbs.reduce(function (prev, name) {
                        return prev.then(function (prevName) {
                            return fileSystem.makeDir('dist/products/' + prevName + '/' + name).then(function () {
                                return prevName + '/' + name;
                            });
                        });
                    }, Q.when(''));
                });
            });

            it('should parse products', function () {
                return Q.each(_.mapValues(categoriesHash, function _parseProductsLinks(cat) {
                    var subCategoriesHash = _.keyBy(cat.pages, function (page) {
                        return urlUtils.createCodeFromUrl(page.ref, page);
                    });
                    var subCatWithProductsHash = _.mapValues(subCategoriesHash, function (subCat) {
                        var subCatTitle = _.trim($('h1.category-name').text());
                        var productsHash = productSearcher.find(subCat.page);
                        return _.extend(subCat, {title: subCatTitle, productsHash: productsHash});
                    });
                    return Q.each(_.extend(cat, {
                        subCategoriesHash: subCatWithProductsHash
                    }));
                }));
            });

            var timer = 0;
            var productCounter = 0;
            var defaultTimeout = 6000;
            var loadedProducts;

            it("Load all products", function (allDone) {

                var all = _.mapValues(categoriesHash, function (cat) {
                    console.log("should load all products for '" + cat.code + "' and save to file system if not exist");

                    return Q.each(_.mapValues(cat.subCategoriesHash, function (subCat, subCode) {
                        //console.log("should load all products for sub category '" + subCode + "'");

                        var productCategories = _.map(subCat.breadcrumbs, function (crumb) {
                            return crumb.name;
                        });

                        var productsHashForLoad = _.mapValues(subCat.productsHash, function (product, code) {
                            var codeParts = _(code).split('.').filter();
                            var name = codeParts.last();
                            var fileName = 'dist/products/' + codeParts.dropRight().join('/') + '/' + name + '.html';

                            productCounter++;

                            return _readOrDownloadAndWrite(fileName, product.href, function (data) {
                                return {
                                    title: product.title,
                                    ref: product.href,
                                    page: data,
                                    code: name,
                                    categoryCodes: productCategories
                                };
                            });
                        });

                        return Q.each(productsHashForLoad);
                    }));
                });

                var catToSave = _.mapValues(categoriesHash, function (cat) {
                    var catObj = {};
                    _.each(cat.subCategoriesHash, function (subCat, key) {
                        catObj[key] = subCat.title;
                    });
                    return catObj;
                });

                function _separate(key) {
                    var separated = _.split(key, '.');
                    if (separated.length == 2) {
                        return separated[1];
                    }
                    return _separate(_.join(_.drop(separated), '.'));
                }

                fileSystem.writeFile('dist/json/categories.json', JSON.stringify(catToSave));

                console.log('Count of products: ', productCounter);
                console.log('Loading will take ~ : ' + ((productCounter - 1) * 6) / 60 + ' minutes');

                Q.each(all).then(function (res) {
                    allDone();
                    loadedProducts = res;
                }, function (err) {
                    allDone(err);
                }).catch(function (err) {
                    allDone(err);
                });

            });

            var categoriesToParse = [
                'kosmetika-kora',
                'new-line-prof-linija',
                'new-line-domashnij-uhod',
                'sante_qj',
                'izrailskaja-kosmetika'
            ];

            var categoryBrands = configuration.brands;

            var productsHash = {};

            it('parse products', function () {

                _.each(categoriesToParse, function (catName) {
                    _.each(loadedProducts[catName], function (subCat) {
                        _.each(subCat, function (product, id) {
                            if (!product.page) return;
                            if (productsHash[id]) {
                                var diff = _.difference(product.categoryCodes, productsHash[id].categoryCodes);

                                productsHash[id].categoryCodes = _.union(productsHash[id].categoryCodes, diff);

                                return;
                            }

                            productsHash[id] = product;

                            productsHash[id].brand = categoryBrands[catName];
                        });
                    });
                });

                var productParser = require('../modules/parsers/product.parser');
                _.each(productsHash, productParser.parse);

                return fileSystem.writeFile(productsHashFileName, JSON.stringify(productsHash));
            });

            it("JSON to CSV", function () {
                var productArrayFileName = 'dist/json/products_array.json';

                var dstFileName = 'dist/result.csv';
                return productWriter.write(productArrayFileName, productsHashFileName, dstFileName);
            });

        });
    });

    describe("Loading images", function () {

        var imageLoader = require('../modules/loaders/image.loader');
        var imageWriter = require('../modules/csv/image.writer');
        var cropImages = require('../modules/images/crop');

        var brands = [
            'Kora',
            'New Line',
            'Sante',
            'Health & Beauty'
        ];

        before(function () {
            return Q.each({
                images: Q.all(brands.map(function (brand) {
                    return fileSystem.makeDir('dist/images/' + brand);
                })),
                toCrop: Q.all(brands.map(function (brand) {
                    return fileSystem.makeDir('dist/to-crop/' + brand);
                }))
            });
        });

        it.skip("should load images", function () {
            var imageMapFile = 'dist/json/img-map.json';

            return imageLoader.load(productsHashFileName, imageMapFile);
        });

        it.skip("crop images", function () {
            var src = 'dist/to-crop/';
            var dst = 'dist/images/';

            return Q.all(brands.map(function (brand) {
                return cropImages.cropImagesFromDir(src + brand, dst + brand);
            }));
        });

        it("import images to CSV", function () {
            var prefix = 'http://korann.host.webasyst.com/wa-data/public/site/images/';

            var dstFileName = 'dist/images.csv';

            return imageWriter.write(productsHashFileName, prefix, dstFileName);
        });
    });

    describe.skip("import vendor codes", function () {
        var vendorCodeWriter = require('../modules/csv/vendor-code.writer');

        var relations = {};
        before("load relation file", function () {
            return fileSystem.readFile('dist/json/relation.json').then(function (content) {
                var relation = JSON.parse(content);

                _.each(relation, function (val) {
                    relations[val.Code + "-code"] = val.Id;
                });
            });
        });

        it("set vendor codes", function () {
            var dstFileName = 'dist/vendors.csv';

            return vendorCodeWriter.write(productsHashFileName, dstFileName, relations);
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

function _mapCategory(cat) {
    console.log("'" + cat.ref + "' category pages to grab: ", cat.sub.length);
    return Q.all(cat.sub.map(function _mapCategoryLink(subCategoryRef) {
        var name = subCategoryRef.replace(/\//g, '_');
        var fileName = 'dist/categories/' + cat.code + '/' + name + '.html';
        return _readOrDownloadAndWrite(fileName, subCategoryRef, function (data) {
            return {ref: subCategoryRef, page: data};
        });
    }));
}

function _readOrDownloadAndWrite(fileName, ref, mapper) {
    return fileSystem.readFile(fileName).then(function (data) {
        //console.log('File is already exist.', fileName);
        //--productCounter;
        //console.log('Left products: ', productCounter);
        //console.log('Remains ~ : ' + ((productCounter - 1) * 6) / 60 + ' minutes');

        return mapper ? mapper(data) : data;
    }, function () {
        //console.log('Warning!!!');
        //return mapper ? mapper(null) : null;
        return _getRequestPromise(ref).then(function (content) {
            return fileSystem.writeFile(fileName, content).then(function () {
                console.log('File was written. ', fileName);

                //--productCounter;
                //console.log('Left products: ', productCounter);
                //console.log('Remains ~ : ' + ((productCounter - 1) * 6) / 60 + ' minutes');

                return mapper ? mapper(content) : content;
            }, function (err) {
                console.log('Error during writing... ', err);

                //--productCounter;
                //console.log('Left products: ', productCounter);
                //console.log('Remains ~ : ' + ((productCounter - 1) * 6) / 60 + ' minutes');

                return mapper ? mapper(content) : content;
            });
        });
    });
}

function _getRequestPromise(ref) {
    var deferred = Q.defer();

    setTimeout(function () {
        _prepareRequest(loader.get(ref))
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    console.log("failed loading '" + ref + "' ..... ");
                    return deferred.reject(err);
                }

                console.log("loaded '" + ref + "' ");
                deferred.resolve(res.text);
            });
    }, timer);

    timer += defaultTimeout;

    return deferred.promise;
}