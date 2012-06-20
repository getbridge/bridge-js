var Bridge = require('bridge');
var bridge = new Bridge({apiKey:'myapikey'});

var chatHandler = {
  message: function(sender, message) {
    console.log(sender, ':', message);
  }
};

var joinCallback = function(channel, name) {
  console.log('Joined channel : ', name);

  // The following RPC call will fail because client was not joined to channel with write permissions
  channel.message('steve', 'This should not work.');
};

bridge.getService('auth', function(auth){
  auth.join("flotype-lovers", chatHandler, joinCallback);
});

bridge.connect();
