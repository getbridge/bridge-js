var Bridge = require('bridge');
  
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

var bridge = new Bridge({apiKey:'myapikey'});
bridge.publishService('auth', authHandler);

bridge.connect();