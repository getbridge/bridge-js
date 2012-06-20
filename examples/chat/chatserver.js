var Bridge = require('bridge-js');
var bridge = new Bridge({apiKey:'myapikey'});
  
var authHandler = {
  join: function(room, password, obj, callback) {
    if (password == "secret123") {
      console.log('Welcome!');
      // new: join channel using the client's objects
      bridge.joinChannel(room, obj, callback) 
    } else {
      console.log('Sorry!');
    }
  }
}

bridge.publishService('auth', authHandler);

bridge.connect();
