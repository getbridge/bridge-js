var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
bridge = new Bridge({host: 'localhost'});

var chat_handler = function(_type, name, message) {
  console.log('CHAT#' + _type + ' ' + name + ': ' + message);
};

bridge.ready(function(){
  bridge.getService('chatserver', function(chatserver) {
    console.log('GOT CHATSERVER', chatserver);

    var join_error = function(original) {
      console.log("ERROR: Can't send join msg to chatserver.");
    };

    var join_success = function(lobby, name) {
      console.log('JOIN SUCCESS', lobby, name);
      lobby.get('foo').call('peter', 'hello');
    };
    chatserver.join_e( 'lobby', chat_handler, join_success, join_error);
  }, function (error) {
    console.log("ERROR: Can't get chat service.")
  });
});
