// dependencies

var cheerio = require('cheerio');
var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;

var urlUtils = require('../../modules/common/url');

// exports

module.exports = {
    find: _find
};

// initialization

// private methods

function _find(htmlPage) {
    var $ = cheerio.load(htmlPage);

    var productsList = $('#product-list .products-list').html();

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

    return _.keyBy(productsArray, function (product) {
        return urlUtils.createCodeFromUrl(product.href, product);
    });
}