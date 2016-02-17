// dependencies

var cheerio = require('cheerio');
var _ = require('lodash');
var entities = require('entities');
var chai = require('chai');
var expect = chai.expect;

var mappings = require('../mappings/mappings');
var categoryMappings = require('../mappings/category.mapping');
var configuration = require('../settings/configuration');
var detailsPatterns = configuration.characteristics;

// exports

module.exports = {
    parse: _parse
};

// initialization

// private methods

function _parse(product) {
    var $ = cheerio.load(product.page);

    var $product = $('article[itemscope][itemtype="http://schema.org/Product"]');

    expect($product.html()).to.exist;

    var $gallery = $('#overview.product-info .product-gallery');

    expect($gallery.html()).to.exist;

    var $image = $('#product-core-image a[href]');

    product.img = $image.attr('href');

    var $price = $('.add2cart span.price[data-price]');

    product.price = parseInt($price.attr('data-price'));

    product.vendor = parseInt($('.hint[itemprop="name"] b').text());

    var $description = $('#product-description');
    expect($description.html()).to.exist;

    var $shortDescription = $('#product-description .hideWrap p').first();

    product.description = _.trim($shortDescription.text());

    _setDetailsInfo(product, $);

    var skinText = $('#product-features tr td[itemprop="tip_kozhi"]').text();

    product.skin = _.map(_.filter(_.split(skinText, ',')), function (skinType) {
        var type = _.trim(skinType);
        if (mappings.skinTypes[type]) {
            return mappings.skinTypes[type];
        }
        return type;
    });

    product.volume = _.trim($('#product-features tr td[itemprop="obem"]').text());

    if (!product.volume) {
        product.volume = _.trim($('#product-features tr td[itemprop="obem_1"]').text());
    }

    product.country = _.trim($('#product-features tr td[itemprop="strana_proizvoditel_"]').text());

    _setCategoriesAndTypes(product);

    delete product.page;

    return product;
}

function _setDetailsInfo(product, node) {
    var detailsHtml = entities.decodeHTML(node('#product-description .hideCont').html());

    var details = _.split(detailsHtml, '<br><br>');

    var prevDetail = {type: '', text: ''};

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
}

function _setCategoriesAndTypes(product) {
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
}