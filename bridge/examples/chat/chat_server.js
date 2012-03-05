var st = require('node-static');
var file = new(st.Server)(__dirname+'/public');
require('http').createServer(function (request, response) {
  request.addListener('end', function () {
    file.serve(request, response);
  });
}).listen(9000);

var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
// bridge = new Bridge({host: 'ec2-50-19-181-20.compute-1.amazonaws.com'});

bridge = new Bridge({apiKey: 'rI5cMTmi'});

var ChatServer = {
  join: function(name, handler, callback){
    console.log("RECEIVED JOIN REQUEST");
    bridge.joinChannel('lobby', handler, callback);
  },
  leave: function(name, handler, callback){
    console.log("RECEIVED LEAVE REQUEST");
    bridge.leaveChannel('lobby', handler, callback);
  }
}

bridge.publishService('chatserver', ChatServer, function(){
    console.log('started chatserver');
});
