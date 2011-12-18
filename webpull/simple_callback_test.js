var Now = new require('now').Now;
var util = require('util');

var now = new Now();

var ChatService = {
  handle_ping: function(fn){
    fn("pong");
  }

}
now.joinChannel('lobby', ChatService);

var loop = function(){
  now.getChannel('lobby')('ping').call(function(resp){
    console.log(resp);
  });
};


setTimeout(loop, 5000);
