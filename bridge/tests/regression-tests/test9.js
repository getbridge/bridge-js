var description = ' Test9: multiple services';
var failureMessage = '';

var test = require(__dirname + '/../lib/test.js')(failureMessage, 1);
var Bridge = require(__dirname + '/../../lib/bridge.js').Bridge;
var _b1 = new Bridge({host: 'localhost', apiKey: 'abcdefgh'});
var _b2 = new Bridge({host: 'localhost', apiKey: 'abcdefgh'});

var count1 = 0;
var count2 = 0;

var ChatServer1 = {
    send: function(msg) {
        count1++;
        test.log("from " + msg + ", handled by chat1, count=" + count1);
    }
}

var ChatServer2 = {
    send: function(msg) {
        count2++;
        test.log("from " + msg + ", handled by chat2, count=" + count2);
    }
}

_b1.ready(function(){
    _b1.publishService('test9_channels', ChatServer1, function() {
        test.log("aa3");
    });
});


_b2.ready(function(){
    _b2.publishService('test9_channels', ChatServer1, function() {
        test.log("aa4");
    });
});

setTimeout(function() {
    test.pass();
//    initClient();
}, 2000);


function initClient() {
    for (var i = 0; i < 10; i++) {
        var b = new Bridge({host: 'localhost', apiKey: 'abcdefgh'});
        (function (id) {
            b.ready(function() {
                b.getService('test9_channels', function(service) {
                    for (var j = 0; j < id; j++) {
                        service.send("b" + id + ", time " + j);
                    }
                });
            });
        })(i);
    }
}