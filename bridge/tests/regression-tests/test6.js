var description = ' Test6: order of initialization';
var failureMessage = 'This test tests if it is possible to publish a service before ready().\nExpected behavior: you can\'t.\n';

var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
var bridge = new Bridge({host: 'localhost'});

try {
    var ConsoleLogServer = {
        log: function(msg) {
            console.log(" Description: ", failureMessage);
            process.exit(1);
        }
    }
    bridge.publishService('test6_consolelog', ConsoleLogServer, function() {
        console.log(" Description: ", failureMessage);
        process.exit(1);
    });
} catch (e) {
    process.exit(0);
}
