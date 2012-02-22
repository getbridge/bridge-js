var description = ' Test7: basic channels';
var failureMessage = 'This test tests Bridge Channels feature.\nExpected behavior: The client can join a channel named "test7".\n';

var test = require(__dirname + '/../lib/test.js')(failureMessage, 1);
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var bridgeServer = new Bridge({host: 'localhost', apiKey: 'abcdefgh'});
var bridgeClient = new Bridge({host: 'localhost', apiKey: 'abcdefgh'});

bridgeServer.ready(function(){
    var ChatServer = {
        join: function(handler, callback) {
            bridgeServer.joinChannel('test7', handler, callback);
        }
    }
    bridgeServer.publishService('test7_channels', ChatServer, function() {
        serverReady();
    });
});

setTimeout(function() {
    test.log('time out');
    test.fail(failureMessage);
}, 2000);

function serverReady() {
    bridgeClient.ready(function() {
        bridgeClient.getService('test7_channels', function(service) {
            service.join(function(msg) {
            }, function() {
                test.pass();
            });
        });
    });
}
