var static = require('node-static');
var file = new(static.Server)('./public');
require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response);
    });
}).listen(9000);

var Now = require('../../lib/now.js').Now;
now = new Now();

var ChatServer = {
  join: function(name, clientId){
    console.log(name + ' joined');
    now.joinChannel('lobby', clientId);
  },
  message: function(name, message){
   lobby('receive').call(name, message);
  }
}

var lobby = now.getChannel('lobby');
now.joinService('chat', ChatServer);
now.joinChannel('lobby');



