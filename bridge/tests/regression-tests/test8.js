var description = ' Test8: channels';
var failureMessage = 'This test tests Bridge Channels feature.\nExpected behavior: The server broadcasts a messages to all clients. The clients must echo back to the server.\n';

var test = require(__dirname + '/../lib/test.js');
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var bridgeServer = new Bridge({host: 'localhost'});

test.pass();

var handler = {
    send: function(msg) {
        console.log(msg);
    }
}

bridgeServer.ready(function(){
    var count = 0;
    var ChatServer = {
        join: function(handler, callback) {
            bridgeServer.joinChannel('test8', handler, callback);
            count++;
        }
    }
    bridgeServer.publishService('test8_channels', ChatServer, function() {
        initClient();
    });
});

function initClient() {
    var b1 = new Bridge({host: 'localhost'});
    var b2 = new Bridge({host: 'localhost'});

    b1.ready(function() {
        b1.getService('test8_channels', function(service) {
            service.join(handler, function () {
                b1.getChannel('test8').get('send')('ping');
            });
        });
    });

    b2.ready(function() {
        b2.getService('test8_channels', function(service) {
            service.join(handler, function () {
                b2.getChannel('test8').get('send')('pong');
            });
        });
    });
}
