var Bridge = require('bridge');
var bridge = new Bridge({apiKey:'abcdefgh', host: 'localhost', port: 8090});

var chatHandler = {
  message: function(sender, message) {
    console.log(sender, ':', message);
  }
};

var joinCallback = function(channel, name) {
  console.log('Joined channel : ', name);
  channel.message('steve', 'Can write to channel:' + name);
};

bridge.getService('auth', function(auth){
  auth.join(chatHandler, joinCallback);
});
bridge.connect();
