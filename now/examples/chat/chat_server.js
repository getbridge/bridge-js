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
  handle_join: function(name, client){
    console.log(name, 'join request', client);
    now.joinChannel('lobby', client);
  },
}
now.joinService('chat', ChatServer);



