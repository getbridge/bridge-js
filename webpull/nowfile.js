var fs = require('fs');
var temp = require('temp');

exports.NowFile = NowFile = (function() {
    function NowFile() {
    }
    NowFile.prototype.store_data = function(data) {
        temp.open( {'suffix':'.png'}, (function(err, info) {
            var writ = fs.writeSync(info.fd, data, 0, data.length, 0);
            console.log('just wrote', writ, data.length);
            fs.closeSync(info.fd);
            this.filepath = info.path;
        }).bind(this) );
    }
    NowFile.prototype.handle_get_localpath = function(callback) {
        callback.call(this.filepath);
    }
    NowFile.prototype.handle_get_data = function(callback) {
        fs.readFile(this.filepath, function(err, data) {
            if (err) {
                throw err;
            }
            callback.call(data.toString())
        });
    }
    return NowFile;
})();