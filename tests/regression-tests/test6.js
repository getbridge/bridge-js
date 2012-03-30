var description = ' Test6: order of initialization';
var failureMessage = 'This test tests if it is possible to publish a service before ready().\nExpected behavior: you can\'t.\n';

var test = require(__dirname + '/../lib/test.js')(failureMessage, 1);
var Bridge = require(__dirname+'/../../lib/bridge.js');
var bridge = new Bridge({host: 'localhost', port: 8090, apiKey: 'abcdefgh'}).connect();

try {
    var ConsoleLogServer = {
        log: function(msg) {
            test.log('calling log, should work without ready()');
            test.pass();
        }
    }
    bridge.publishService('test6_consolelog', ConsoleLogServer, function() {
        test.log('calling publishService, should work without ready()');
        test.pass();
    });
} catch (e) {
    test.fail();
}
