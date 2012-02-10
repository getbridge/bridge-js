var description = ' Test2: basic remote function calling';
var failureMessage = 'This test tests the ability to send message between one instance of bridge in js.\nExpected behavior: If you can\'t pass this test, you\'ve done a pretty wrong thing.\n';

var test = require(__dirname + '/../lib/test.js');
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var bridge = new Bridge({host: 'localhost'});

bridge.ready(function(){
    var ConsoleLogServer = {
        log: function(msg, somethingClientDoesNotProvide) {
            if (msg === '123' && somethingClientDoesNotProvide == undefined) {
                test.pass();
            } else {
                test.fail(failureMessage);
            }
        }
    }
    bridge.publishService('test2_consolelog', ConsoleLogServer, function() {
        bridge.getService('test2_consolelog', function(service) {
            console.log(description);
            service.log('123');
        });
    });
});