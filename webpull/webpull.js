var now = new require('now').Now();
var get = require("get");
var nowfile = require('./nowfile');
var util = require('util');

WebpullService = (function() {
    function WebpullService() {}
    WebpullService.prototype.handle_fetch_url = function(url, callback) {
        var dl = new get({ uri: url });
        dl.asBuffer( function (err, data) {
            console.log('FETCH RESULT', err);
            if (!err) {
                var file = new nowfile.NowFile();
                file.store_data(data);
                now.register_service(file);
                callback.call(file);
            }
        });
    }
    return WebpullService;
})();

webpull = new WebpullService();
now.register_service(webpull, 'webpull');

