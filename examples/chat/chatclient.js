var Bridge = require('bridge');
var bridge = new Bridge({apiKey:'myapikey'});

var chatHandler = {
  message: function(sender, message) {
    console.log(sender, ':', message);
  }
}

var joinCallback = function(channel, name) {
  console.log('Joined channel : ', name);
  channel.message('steve', 'Flotype Bridge is nifty');
}

bridge.getService('auth', function(auth){
  auth.join('flotype-lovers', 'secret123', chatHandler, joinCallback);
});
bridge.connect();
