var description = ' Test8: channels';
var failureMessage = 'This test tests Bridge Channels feature.\nExpected behavior: The server broadcasts a messages to all clients. The clients must echo back to the server.\n';

var test = require(__dirname + '/../lib/test.js')(failureMessage, 1);
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var bridgeServer = new Bridge({host: 'localhost'});

bridgeServer.ready(function(){
    var joinCount = 0;
    var pongCount = 0;

    var ChatServer = {
        join: function(handler, callback) {
            bridgeServer.joinChannel('test8', handler, callback);
            joinCount++;

            if (joinCount == 2) {
                bridgeServer.getService('test8_channels', function(service) {
                    service.join({
                        send: function(msg) {
                            pongCount++;
                            if (pongCount == 5) {
                                test.pass();
                            }
                        }
                    }, function () {
                        test.log("all clients init");
                        bridgeServer.getChannel('test8', function(test8){
                          test8.send('ping');
                        });
                    });
                });
            }
        }
    }
    bridgeServer.publishService('test8_channels', ChatServer, function() {
        test.log("server init");
        initClient();
    });
});

setTimeout(function() {
    test.log('time out');
    test.fail();
}, 5000);

function initClient() {
    var b1 = new Bridge({host: 'localhost'});
    var b2 = new Bridge({host: 'localhost'});

    var handle = {
                send: function(msg) {
                    if (msg == 'ping') {
                        test.log('ping received');
                        b1.getChannel('test8', function(test8){
                          test8.send('pong from b1');
                        });
                        b2.getChannel('test8', function(test8){
                          test8.send('pong from b2');
                        });
                    }
                }
            };
    
    b1.ready(function() {
        b1.getService('test8_channels', function(service) {
            service.join(handle, function () {
                test.log('b1 init');
            });
        });
    });

    b2.ready(function() {
        b2.getService('test8_channels', function(service) {
           service.join(handle, function () {
                test.log('b2 init');
            });
        });
    });
}
