var fs = require('fs');
var url = require('url');
var csv = require('csv');
var limit = require("simple-rate-limiter");
var _ = require('lodash');
var async = require('async');
var cheerio = require('cheerio');
var request = limit(require("request")).to(4).per(1000);
var csvLib = csv();


//Setting the first link to start scrapping
//var base = 'rentomojo.com';
//var firstLink = 'http://' + base + '/bangalore/?_escaped_fragment_=/';

var base = 'www.mokriya.com';
var firstLink = 'http://' + base ;

var crawled = [];
var inboundLinks = [];


var makeRequest = function(crawlUrl, callback){
  var startTime = new Date().getTime();
  request(crawlUrl, function (error, response, body) {

    var singlePageObject = {};
    singlePageObject.links = [];

    var $ = cheerio.load(body);
    singlePageObject.title = $('title').text();
    singlePageObject.url = crawlUrl;
    
    $('a').each(function(i, elem){
        var tempUrl = elem.attribs.href;
        
        //converting relative links to abosulte url
        
        if(tempUrl != null && ( tempUrl.startsWith('/') || tempUrl.indexOf("www") == -1 ) ){
            
            tempUrl = 'http://' + base + tempUrl ;//+ '?_escaped_fragment_=/';
        }
        
        
        // Avoiding links containing email id
        if(tempUrl != null && tempUrl.indexOf("@") == -1)  {
            singlePageObject.links.push({linkText: $(elem).text(), linkUrl: tempUrl});
        }
      
    });
    callback(error, singlePageObject);
  });
}

var doScrap = function(link){
    
    makeRequest(link, function(error, singlePageObject){
        
        crawled.push(singlePageObject.url);
        console.log("Crawled:"+singlePageObject.url);

        async.eachSeries(singlePageObject.links, function(item, callback){

              if(item.linkUrl)  {

                  parsedUrl = url.parse(item.linkUrl);

                  // test if the url actually points to the same domain
                  if(parsedUrl.hostname == base){
                    inboundLinks.push(item.linkUrl);
                  }

              }
              callback();
        }
        ,function(){
              var nextLink = _.difference(_.uniq(inboundLinks), crawled);
              if(nextLink.length > 0){
                doScrap(nextLink[0]);
              }
              else {
                console.log('done!');

                  var newArr = [];
                  while(crawled.length) newArr.push(crawled.splice(0,1));
                  csvLib.from(newArr).to.path('./data.csv');
              }
        });
    }); 

}

doScrap(firstLink);