var now = new require('now').Now();
var gm = require('gm');
var nowfile = require('./nowfile');
var temp = require('temp');

ResizeService = (function() {
    function ResizeService() {}
    ResizeService.prototype.handle_resize = function(file, x, y, callback) {
        console.log('GOT RESIZE FILE', file.render_ref() );
        file('get_localpath').call( function(result) {
            var path = temp.path({suffix: '.png'});
            gm(result).resize(x, y).noProfile().write( path, function(err) {
                console.log('ERROR', err);
            });
            var file = new nowfile.NowFile();
            now.register_service(file);
            file.filepath = path;
            callback.call(file);
        } ) ;
    }
    return ResizeService;
})();

resize = new ResizeService();
now.register_service(resize, 'resize');

