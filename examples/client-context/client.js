var Bridge = require('bridge-js');
var bridge = new Bridge({apiKey:'myapikey'});


var pongService = {
  pong: function(message) {
    console.log(message);
  }
}

bridge.storeObject("pong", pongObject);

bridge.getService("ping", function(pinger){
  pinger.ping();
});


bridge.connect();
