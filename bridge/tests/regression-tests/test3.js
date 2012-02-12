var description = ' Test3: basic remote function calling';
var failureMessage = 'This test tests the ability to send message between one instance of bridge in js.\nExpected behavior: If you can\'t pass this test, you\'ve done a pretty wrong thing.\n';

var test = require(__dirname + '/../lib/test.js')(failureMessage, 1);
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var bridge = new Bridge({host: 'localhost'});

bridge.ready(function(){
    var ConsoleLogServer = {
        log: function(msg) {
            if (msg === '123') {
                test.pass();
            } else {
                test.log('received ' + msg + ' but expected 123');
                test.fail(failureMessage);
            }
        }
    }
    bridge.publishService('test3_consolelog', ConsoleLogServer, function() {
        bridge.getService('test3_consolelog', function(service) {
            service.log('123', ['some list'], {something:'else'});
        });
    });
});