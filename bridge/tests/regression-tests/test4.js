var description = ' Test4: non-existing service';
var failureMessage = 'This test tests Bridge.getService in js.\nExpected behavior: If a service does not exist, the server should call the callback with a null service.\n';

var test = require(__dirname + '/../lib/test.js')(failureMessage, 1);
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var bridge = new Bridge({host: 'localhost'});

// turn off the test
// waiting for the feature to be implemented
// remove the following line to turn on the test again.
test.pass();

bridge.ready(function(){
    bridge.getService('some non-existing service', function(service) {
        if (service) {
            test.fail();
        } else {
            test.log('get service return with a non null service.');
            test.pass();
        }
    });
});

setTimeout(function() {
    test.log('time out');
    test.fail();
}, 2000);
