var description = ' Test5: multiple instances of bridge';
var failureMessage = 'This test tests the ability to create multiple instances of bridge in js.\nExpected behavior: should be able to create multiple instance, and send messages between them.\n';

var test = require(__dirname + '/../lib/test.js')(failureMessage, 1);
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var bridge = new Bridge({host: 'localhost'});

bridge.ready(function(){
    var count = 0;

    var ConsoleLogServer = {
        log: function(msg) {
            count++;
            if (count === 5) {
                test.pass();
            }
        }
    }
    bridge.publishService('test5_consolelog', ConsoleLogServer, function() {
        serverReady();
    });
});

setTimeout(function() {
    test.log('time out');
    test.fail();
}, 2000);

function serverReady() {
    var b1 = new Bridge({host: 'localhost'});
    var b2 = new Bridge({host: 'localhost'});
    var b3 = new Bridge({host: 'localhost'});
    b1.ready(function() {
        b1.getService('test5_consolelog', function(service) {
            service.log('b1 1');
            service.log('b1 2');
        });
    });
    b2.ready(function() {
        b2.getService('test5_consolelog', function(service) {
            service.log('b2 1');
        });
    });
    b2.ready(function() {
        b2.getService('test5_consolelog', function(service) {
            service.log('b2 2');
        });
    });
    b3.ready(function() {
        b3.getService('test5_consolelog', function(service) {
            service.log('b3 1');
        });
    });
}
