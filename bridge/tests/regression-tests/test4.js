var description = ' Test4: non-existing service';
var failureMessage = 'This test tests Bridge.getService in js.\nExpected behavior: If a service does not exist, the server should call the callback with a null service.\n';

var test = require(__dirname + '/../lib/test.js');
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var bridge = new Bridge({host: 'localhost'});

bridge.ready(function(){
    bridge.getService('some non-existing service', function(service) {
        if (service) {
            test.fail(failureMessage);
        } else {
            test.pass();
        }
    });

    setTimeout(function() {
        test.fail(failureMessage);
    }, 2000);
});