var description = 'Test3: basic remote function calling';
var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
bridge = new Bridge({host: 'localhost'});
bridge.ready(function(){
    var ConsoleLogServer = {
        log: function(msg) {
            if (msg === '123') {
                process.exit(0);
            } else {
                process.exit(1);
            }
        }
    }
    bridge.publishService('test3_consolelog', ConsoleLogServer, function() {
        bridge.getService('test3_consolelog', function(service) {
            console.log(description);
            service.log('123', ['some list'], {something:'else'});
        });
    });
});