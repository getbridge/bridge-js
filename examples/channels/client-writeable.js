var Bridge = require('bridge');
var bridge = new Bridge({apiKey:'myapikey'});

var chatHandler = {
  message: function(sender, message) {
    console.log(sender, ':', message);
  }
};

var joinCallback = function(channel, name) {
  console.log('Joined channel : ', name);

  // The following RPC call will succeed because client was joined to channel with write permissions
  channel.message('steve', 'Can write to channel:' + name);
};

bridge.getService('auth', function(auth){
  auth.join("flotype-lovers", "secret123", chatHandler, joinCallback);
});

bridge.connect();
