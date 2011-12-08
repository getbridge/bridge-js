var now = new require('now').Now();
var request = require('request');

FileService = (function() {
    function FileService(filename, body) {
        this.filename = filename;
        this.body = body;
        console.log('filename', filename);
    }
    FileService.prototype.handle_get_body = function(callback) {
        callback.call(this.body);
    }
    return FileService;
})();

WebpullService = (function() {
    function WebpullService() {}
    WebpullService.prototype.handle_fetch_url = function(url, callback) {
        request('http://www.google.com', function (error, response, body) {
          if (!error && response.statusCode == 200) {
            var file = new FileService('test.txt', body);
            now.register_service(file);
            callback.call(file.filename, file);
          }
        });
    }
    return WebpullService;
})();

webpull = new WebpullService();
now.register_service(webpull, 'webpull');