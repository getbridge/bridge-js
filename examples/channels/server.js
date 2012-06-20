var Bridge = require('bridge');
var bridge = new Bridge({apiKey:'myapikey'});

var authHandler = {
  join: function(channelName, obj, callback) {
    // Passing false means the client cannot write to the channel
    bridge.joinChannel(channelName, obj, false, callback);
  },
  joinWriteable: function(channelName, secretWord, obj, callback) {
    if(secretWord == "secret123") {
      // Passing true means the client can write to the channel as well as read from it
      bridge.joinChannel(channelName, obj, true, callback);
    }
  }
};

bridge.publishService('auth', authHandler);

bridge.connect();
