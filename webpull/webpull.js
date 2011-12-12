var Now = new require('now').Now;
var get = require("get");
var nowfile = require('./nowfile');
var util = require('util');

var now = new Now();

var WebpullService = {
  fetch_url: function(url, callback) {
    var dl = new get({ uri: url });
    dl.asBuffer( function (err, data) {
        console.log('FETCH RESULT', err);
        if (!err) {
            var file = new nowfile.NowFile();
            file.store_data(data);
            now.joinService(file);
            callback.call(file);
        }
    });
  }
}


now.joinService('webpull', WebpullService);

