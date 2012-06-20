var Bridge = require('bridge-js');
var bridge = new Bridge({apiKey:'myapikey'});


var pingObject = {
  ping: function() {

    console.log("PING!");

    callingClient = bridge.context();
    callingClient.getService("pong", function(ponger) {
      ponger.pong("PONG!");
    });

  }
}

bridge.publishService("ping", pingObject);
bridge.connect();

