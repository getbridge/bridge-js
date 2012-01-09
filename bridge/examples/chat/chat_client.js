var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
bridge = new Bridge({host: 'localhost'});

var chat_handler = {
  handle_msg: function(name, message) {
    console.log('CHAT ' + name + ': ' + message);
  }
};

bridge.ready(function(){
  var chat = bridge.getService('chat');
  //chat( 'doesnotexist' ).call_e( function(data){
  //  console.log('ERROR INFO', data);
  //}, 31337);

  chat('join').call('lobby', chat_handler, function(lobby, name) {
    console.log('JOIN SUCCESS', lobby, name);
    for (var i = 0; i <= 20; i++) {
      lobby('msg').call('peter', 'hello' + i);
    }
  });
});
