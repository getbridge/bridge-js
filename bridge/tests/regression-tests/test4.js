var description = ' Test4: non-existing service';
var failureMessage = 'This test tests Bridge.getService in js.\nExpected behavior: If a service does not exist, the server should call the callback with a null service.\n';

var test = require(__dirname + '/../lib/test.js');
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var bridge = new Bridge({host: 'localhost'});

bridge.ready(function(){
    /**
       Server should not return a service for non-existing name.
       Note: find a better way to detect if the server has that service or not
     */
    bridge.getService('some non-existing service', function(service) {
        test.fail(failureMessage);
    });
    setTimeout(function () {
        test.pass();
    }, 2000);
});