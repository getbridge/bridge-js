var Bridge = require('bridge');
var bridge = new Bridge({apiKey: 'abcdefgh'});
bridge.connect();


//
// Publishing a Bridge service
//
// Any Javascript object can be published. A published service 
// can be retrieved by any Bridge client with the same API key pair.
//
// Only Bridge clients using the prviate API key may publish services.
//
var testService = {
  ping: function(cb){
    console.log('Received ping request!');
    cb('Pong');
  }
}

bridge.publishService('testService', testService);



//
// Retrieving a Bridge service 
//
// This can be done from any Bridge client connected to the same 
// Bridge server, regardless of language.
// If multiple clients publish a Bridge service, getService will 
// retrieve from the publisher with the least load.
//
bridge.getService('testService', function(testService, name){
  console.log('Sending ping request');
  testService.ping(function(msg){
    console.log(msg);
  });
});