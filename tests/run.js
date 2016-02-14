var superTest = require('supertest');
var chai = require('chai');
var _ = require('lodash');
var Q = require('q');
var fs = require('fs');
var cheerio = require('cheerio');
var entities = require("entities");

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

    var categoriesHash = {};

    _.each(categoryCodes, function (code) {
        it('should parse "' + code + '" categories links', function () {
            var categoryRef = '/' + code + '/';

            var filtered = _filterCategories(categories, categoryRef);
            categoriesToGrab.push({categories: filtered, ref: categoryRef, code: code});

            categoriesHash[code] = {
                code: code,
                ref: categoryRef,
                sub: filtered
            };
        });
    });

    var categoryPagesPromise;

    it('should load all categories page', function (done) {

        var toGrabPromises = _.mapValues(categoriesHash, function (cat) {
            return _makeDir('dist/categories/' + cat.code).then(function () {
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


    it('should parse products', function (done) {

        var categoriesHashWithProductsPromise = _.mapValues(categoriesHash, function (cat) {

            var breadcrumbs = _.filter(cat.ref.split('/'));
            var promise = breadcrumbs.reduce(function (prev, name) {
                return prev.then(function (prevName) {
                    return _makeDir('dist/products/' + prevName + '/' + name).then(function () {
                        return prevName + '/' + name;
                    });
                });
            }, Q.when(''));

            return promise.then(function () {

                var subCategoriesHash = _.keyBy(cat.pages, function (page) {
                    return _createCodeFromUrl(page.ref, page);
                });

                var subCatWithProductsHash = _.mapValues(subCategoriesHash, function (subCat) {
                    var $ = cheerio.load(subCat.page);

                    var productsList = $('#product-list .products-list').html();
                    var $categoryName = $('h1.category-name');

                    var isEmpty = _.isEmpty(productsList);

                    if (isEmpty) {
                        console.log(subCat.ref + " - category is empty. Skipping... ");
                        return {categoryRef: subCat.ref, products: {}};
                    }

                    expect($('#product-list .products-list ul')).to.have.length(1);
                    expect($('#product-list .products-list ul li')).not.to.be.empty;

                    expect($('#product-list .products-list ul li[itemscope][itemtype="http://schema.org/Product"]')).not.to.be.empty;

                    var $products = $('#product-list .products-list ul li[itemscope][itemtype="http://schema.org/Product"] .photo a[title]');

                    expect($products).not.to.be.empty;

                    var productsArray = $products.map(function (i, product) {
                        var $product = $(product);

                        return {
                            title: $product.attr('title'),
                            href: $product.attr('href')
                        };
                    }).toArray();

                    var productsHash = _.keyBy(productsArray, function (product) {
                        return _createCodeFromUrl(product.href, product);
                    });

                    return _.extend(subCat, {
                        title: _.trim($categoryName.text()),
                        products: productsArray,
                        productsHash: productsHash
                    });
                });

                return Q.each(_.extend(cat, {
                    subCategoriesHash: subCatWithProductsHash
                }));
            });

        });

        Q.each(categoriesHashWithProductsPromise).then(function (res) {
            done();
        }, function (err) {
            done(err);
        }).catch(function (err) {
            done(err);
        });
    });

    var timer = 0;
    var productCounter = 0;
    var defaultTimeout = 6000;
    var loadedProducts;

    it("Load all products", function (allDone) {

        var all = _.mapValues(categoriesHash, function (cat) {
            console.log("should load all products for '" + cat.code + "' and save to file system if not exist");

            return Q.each(_.mapValues(cat.subCategoriesHash, function (subCat, subCode) {
                console.log("should load all products for sub category '" + subCode + "'");

                var productCategories = _.map(subCat.breadcrumbs, function (crumb) {
                    return crumb.name;
                });

                var productsHashForLoad = _.mapValues(subCat.productsHash, function (product, code) {
                    var codeParts = _(code).split('.').filter();
                    var name = codeParts.last();
                    var fileName = 'dist/products/' + codeParts.dropRight().join('/') + '/' + name + '.html';

                    productCounter++;

                    return _readOrDownloadAndWrite(fileName, product.href, function (data) {
                        return {title: product.title, ref: product.href, page: data, code: name, categoryCodes: productCategories};
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

        _writeFile('dist/json/categories.json', JSON.stringify(catToSave));

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

    var categoriesToParse = ['kosmetika-kora'];

    var categoryBrands = {
        'kosmetika-kora': 'Kora',
        'new-line-prof-linija': 'New Line',
        'new-line-domashnij-uhod': 'New Line',
        'sante_qj': 'New Line',
        'izrailskaja-kosmetika': 'Health & Beauty'
    };

    var detailsPatterns = {
        composition: 'Активные ингредиенты',
        action: 'Действие',
        application: 'Применение',
        result: 'Результат',
        contraindications: 'Противопоказания',
        course: 'Курс'
    };

    var skinTypesMappings = {
        "Средства Anti-Aging": "Противовозрастные средства",
        "Для чувствительная кожи": "Для чувствительной кожи"
    };

    var categoryMappings = {
        "dlya-litsa": {
            label: 'Для лица',
            types: {
                "ochishenie-tonizirovanie": "Очищающие средства",
                "pilingi-i-skraby": "Пилинги/Скрабы",
                "toniki": "Тоники",
                "uvlazhnenie-kozhi": "Средства для увлажнения кожи",
                "chuvstvitelnaja-kozha": "Уход за чувствительной кожей",
                "problemnaja-kozha": "Уход за жирной проблемной кожей",
                "pitanie-zashita-kozhi": "Питание, защита кожи",
                "linija-uhoda-za-vozrastnoj-kozhej-s-efektom-botoksa": "Мимические и возрастные морщины",
                "zrelaja-kozha": "Уход за зрелой кожей",
                "uhod-za-kozhej-vokrug-glaz": "Уход за кожей век и губами",
            },
            productTypes: {
                "pilingi-i-skraby": ["Пилинг", "Гоммаж", "Скраб"],
                "toniki": ["Тоник"],
                "uvlazhnenie-kozhi": ["Крем-сыворотка", "Сыворотка", "Крем", "Маска"],
                "chuvstvitelnaja-kozha": ["Крем"],
                "problemnaja-kozha": ["Крем", "Маска", "Крем-гель", "Гель"],
                "pitanie-zashita-kozhi": ["Крем"],
                "linija-uhoda-za-vozrastnoj-kozhej-s-efektom-botoksa": ["Крем", "Крем-сыворотка", "Сыворотка", "Лифтинг", "Крем-лифтинг"],
                "zrelaja-kozha": ["Крем", "Крем-гель", "Гель", "Лифтинг", "Крем-лифтинг", "Маска"],
                "uhod-za-kozhej-vokrug-glaz": ["Лосьон", "Крем-гель", "Крем", "Крем-сыворотка", "Сыворотка"]
            }
        },
        "dlya-volos": {
            label: "Для волос",
            types: {
                "shampuni": "Шампуни",
                "balzamy": "Бальзамы для волос",
                "maski": "Маски для волос",
                "toniki": "Тоники для волос"
            },
            productTypes: {
                "shampuni": ["Шампунь"],
                "balzamy": ["Бальзам"],
                "maski": ["Маска"],
                "toniki": ["Тоник"]
            }
        },
        "dlya-tela": {
            label: "Для тела",
            types: {
                "uhod-za-rukami-i-nogami": "Уход за руками и ногами",
                "sredstva-dlja-dusha-i-vanny": "Средства для душа и ванны",
                "anticelljulitnyj-kompleks": "Антицеллюлитный комплекс",
                "solncezashitnye-sredstva": "Солнцезащитные средства"
            },
            productTypes: {
                "uhod-za-rukami-i-nogami": ["Крем", "Лосьон"],
                "sredstva-dlja-dusha-i-vanny": ["Гель"],
                "anticelljulitnyj-kompleks": ["Крем", "Гель"],
                "solncezashitnye-sredstva": ["Крем"]
            }
        }
    };

    var productTypeMappings = {
        'pilingi-i-skraby': '',
    };

    it('parse products', function (done) {
        var productsHash = {};

        _.each(categoriesToParse, function (catName) {
            _.each(loadedProducts[catName], function (subCat) {
                _.each(subCat, function (product, id) {
                    if (!product.page) return;
                    if (productsHash[id]) {
                        var diff = _.difference(product.categoryCodes,productsHash[id].categoryCodes);

                        productsHash[id].categoryCodes = _.union(productsHash[id].categoryCodes, diff);

                        return;
                    }

                    productsHash[id] = product;

                    productsHash[id].brand = categoryBrands[catName];
                });
            });
        });

        _.each(productsHash, function (product) {
            var $ = cheerio.load(product.page);

            var $product = $('article[itemscope][itemtype="http://schema.org/Product"]');

            expect($product.html()).to.exist;

            var $gallery = $('#overview.product-info .product-gallery');

            expect($gallery.html()).to.exist;

            var $image = $('#product-core-image a[href]');

            product.img = $image.attr('href');

            var $price = $('.add2cart span.price[data-price]');

            product.price = parseInt($price.attr('data-price'));

            var $description = $('#product-description');
            expect($description.html()).to.exist;

            var $shortDescription = $('#product-description .hideWrap p').first();

            product.description = _.trim($shortDescription.text());

            var detailsHtml = entities.decodeHTML($('#product-description .hideCont').html());

            var details = _.split(detailsHtml, '<br><br>');

            var prevDetail = {
                type: '',
                text: ''
            };

            _.each(details, function (detail) {
                if (detail.indexOf('id="product-features"') > -1) return;

                var foundPattern = _.findKey(detailsPatterns, function (pattern) {
                    return detail.indexOf(pattern) > -1;
                });

                if (!foundPattern) {
                    if (!prevDetail.type) {
                        product.description += _.trim(detail);
                        return;
                    }

                    product[prevDetail.type] = (product[prevDetail.type] || '') + detail;
                    return;
                }

                var strongReplacePattern = '<strong>(\s*)' + detailsPatterns[foundPattern] + '(:|.)?(\s*)<\/strong>(:|.)?';
                var bReplacePattern = '<b>(\s*)' + detailsPatterns[foundPattern] + '(:|.)?(\s*)<\/b>(:|.)?';
                var clearDetail = _.replace(detail, new RegExp(strongReplacePattern, 'g'), '');

                clearDetail = _.replace(clearDetail, new RegExp(bReplacePattern, 'g'), '');

                product[foundPattern] = (product[foundPattern] || '') + clearDetail;

                prevDetail.type = foundPattern;
            });

            _.each(detailsPatterns, function (name, pattern) {
                if (!product[pattern]) return;

                product[pattern] = _.trim(cheerio.load(product[pattern]).root().text());
            });

            var skinText = $('#product-features tr td[itemprop="tip_kozhi"]').text();

            product.skin = _.map(_.filter(_.split(skinText, ',')), function (skinType) {
                var type = _.trim(skinType);
                if (skinTypesMappings[type]) {
                    return skinTypesMappings[type];
                }
                return type;
            });

            product.volume = _.trim($('#product-features tr td[itemprop="obem"]').text());

            if (!product.volume) {
                product.volume = _.trim($('#product-features tr td[itemprop="obem_1"]').text());
            }

            product.country = _.trim($('#product-features tr td[itemprop="strana_proizvoditel_"]').text());

            var catMappingKey = _.find(product.categoryCodes, function (catCode) {
                return !_.isEmpty(categoryMappings[catCode]);
            });

            if (catMappingKey) {
                product.categories = _.filter(categoryMappings[catMappingKey].types, function (type, key) {
                    return _.includes(product.categoryCodes, key);
                });

                var types = _.filter(categoryMappings[catMappingKey].productTypes, function (type, key) {
                    return _.includes(product.categoryCodes, key);
                });

                _.each(types, function (type) {
                    product.types = _.union(product.types, type);
                });
            }
            // todo:
            delete product.page;
        });

        _writeFile('dist/json/products.json', JSON.stringify(productsHash));

        done();
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
        return _readFile(fileName).then(function (data) {
            //console.log('File is already exist.', fileName);
            --productCounter;
            //console.log('Left products: ', productCounter);
            //console.log('Remains ~ : ' + ((productCounter - 1) * 6) / 60 + ' minutes');

            return mapper ? mapper(data) : data;
        }, function () {
            console.log('Warning!!!');
            return mapper ? mapper(null) : null;
            return _getRequestPromise(ref).then(function (content) {
                return _writeFile(fileName, content).then(function () {
                    console.log('File was written. ', fileName);

                    --productCounter;
                    console.log('Left products: ', productCounter);
                    console.log('Remains ~ : ' + ((productCounter - 1) * 6) / 60 + ' minutes');

                    return mapper ? mapper(content) : content;
                }, function (err) {
                    console.log('Error during writing... ', err);

                    --productCounter;
                    console.log('Left products: ', productCounter);
                    console.log('Remains ~ : ' + ((productCounter - 1) * 6) / 60 + ' minutes');

                    return mapper ? mapper(content) : content;
                });
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

    function _createCodeFromUrl(url, obj) {
        var refParts = _.filter(_.split(url, '/'));

        obj.breadcrumbs = _.mapValues(_.keyBy(refParts), function (part) {
            return {name: part};
        });

        var code = _.join(refParts, '.');
        return code;
    }

    function _getRequestPromise(ref) {
        var deferred = Q.defer();

        setTimeout(function () {
            _prepareRequest(request.get(ref))
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

});