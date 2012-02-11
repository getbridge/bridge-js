var description = ' Test8: channels';
var failureMessage = 'This test tests Bridge Channels feature.\nExpected behavior: The server broadcasts a messages to all clients. The clients must echo back to the server.\n';

var test = require(__dirname + '/../lib/test.js');
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var bridgeServer = new Bridge({host: 'localhost'});

test.pass();

bridgeServer.ready(function(){
    var count = 0;
    var ChatServer = {
        join: function(handler, callback) {
            bridgeServer.joinChannel('test8', handler, callback);
            count++;

            if (count == 2) {
                bridgeServer.getService('test8_channels3', function(service) {
                    service.join({
                        send: function(msg) {
                        }
                    }, function () {
                        console.log("run here");
                       bridgeServer.getChannel('test8').get('send')('ping');
                    });
                });
            }
        }
    }
    console.log("run here1");
    bridgeServer.publishService('test8_channels1', ChatServer, function() {
        console.log("run h2ere");
        initClient();
    });
});

function initClient() {
    var b1 = new Bridge({host: 'localhost'});
    var b2 = new Bridge({host: 'localhost'});

    b1.ready(function() {
        b1.getService('test8_charsfgdfhdnnels3', function(service) {
            service.join({
                send: function(msg) {
                    if (msg == 'ping')
                        b1.getChannel('test8').get('send')('pong from b1');
                }
            }, function () {});
        });
    });

    b2.ready(function() {
        b2.getService('test8_channels3', function(service) {
           service.join({
                send: function(msg) {
                    if (msg == 'ping')
                        b2.getChannel('test8').get('send')('pong from b2');
                }
            }, function () {});
        });
    });
}
