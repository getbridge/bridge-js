var description = ' Test6: order of initialization';
var failureMessage = 'This test tests if it is possible to publish a service before ready().\nExpected behavior: you can\'t.\n';

var test = require(__dirname + '/../lib/test.js')(failureMessage, 1);
var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
var bridge = new Bridge({host: 'localhost'});

try {
    var ConsoleLogServer = {
        log: function(msg) {
            test.log('calling log, should not work without ready()');
            test.fail();
        }
    }
    bridge.publishService('test6_consolelog', ConsoleLogServer, function() {
        test.log('calling publishService, should not work without ready()');
        test.fail();
    });
} catch (e) {
    test.pass();
}
