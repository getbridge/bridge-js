console.log('Test1: basic remote function calling');
var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
bridge = new Bridge({host: 'localhost'});
bridge.ready(function(){
    var ConsoleLogServer = {
        log: function(msg) {
            if (msg == '123') {
                process.exit(0);
            } else {
                process.exit(1);
            }
        }
    }
    bridge.publishService('test1_consolelog', ConsoleLogServer, function() {
        bridge.getService('test1_consolelog', function(service) {
            service.log('123');
        });
    });
});