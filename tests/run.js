var superTest = require('supertest');

var chai = require('chai');

var assert = chai.assert;
var should = chai.should();
var expect = chai.expect;

//var _ = require('lodash');
//var Q = require('q');

var config = require('../settings/config.json');

var site = config.site;
console.log('Site to parse: ', site);

var request = superTest(site);

var mainPageParser = require('../modules/parsers/main-page.parser');

describe('main site checking', function () {

    var $, fileContent;

    before('read file if exist', function (done) {
        var fs = require('fs');
        fs.readFile(config.file, 'utf8', function (err, data) {
            if (err) {
                console.log("File does not exist.");
            }

            fileContent = data;
            done();
        });
    });

    it('respond with whole page', function (done) {
        if (fileContent) {
            $ = mainPageParser.parse(fileContent);
            return done();
        }

        console.log("Main html file does not exist. Need to download.");
        request
            .get('/')
            .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8')
            .set('Accept-Encoding', 'gzip, deflate, sdch')
            .set('Accept-Language', 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4,es;q=0.2')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);

                var fs = require('fs');
                fs.writeFile(config.file, res.text, function (err, data) {
                    if (err) {
                        return done(err);
                    }

                    $ = mainPageParser.parse(res.text);

                    assert.notEqual($, null);
                    assert.notEqual($, undefined);

                    if (err) return done(err);
                    done();
                });
            });
    });

    it('html should successfully parsed as cheerio object', function (done) {

        expect($('ul.accordion').html()).to.exist;

        //var $main = $('main .content').html();
        //
        //expect($main).to.exist;
        //
        //expect($main).not.to.be.undefined;
        //expect($main).not.to.be.null;

        //assert.notEqual($main.length, 0);

        done();
    });

    it('should parse kora categories', function () {
        //var categoryLinks = $('.dcjq-parent-li ul .dcjq-parent-li a.dcjq-parent');

        //console.log($('.dcjq-parent-li ul .dcjq-parent-li').html());
        //console.log($('.dcjq-parent-li ul').html());
        //console.log($('.dcjq-parent-li').html());

        var categories = $('ul.accordion li a');

        console.log('Categories count - ', categories.length);

        expect(categories.html()).not.to.be.empty;

        // todo: add title and description
        var hrefs = categories.map(function (i, cat) {
            return $(cat).attr('href');
        }).filter(function (i, ref) {
            return ref.indexOf('/kosmetika-kora/') > -1;
        }).toArray();

        console.log('Kora categories count - ', hrefs.length);
        console.log('Kora categories - ', hrefs);
        assert.isAbove(hrefs.length, 3);
    });

});