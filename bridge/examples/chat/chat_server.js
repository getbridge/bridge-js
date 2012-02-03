var static = require('node-static');
var file = new(static.Server)(__dirname+'/public');
require('http').createServer(function (request, response) {
  request.addListener('end', function () {
    file.serve(request, response);
  });
}).listen(9000);

var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
// bridge = new Bridge({host: 'ec2-50-19-181-20.compute-1.amazonaws.com'});

bridge = new Bridge({host: 'localhost'});

bridge.ready(function(){

  var ChatServer = {
    join: function(name, handler, callback){
      console.log("RECEIVED JOIN REQUEST", name, handler, callback);
      bridge.joinChannel('lobby', handler, callback);
    },
  }

  bridge.publishService('chatserver', ChatServer, function(){
      console.log('started chatserver');
  });

});

