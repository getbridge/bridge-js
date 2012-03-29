var Bridge = require(__dirname + '/../bridge').Bridge;
var http = require('http');
var request = require('request')

bridge = new Bridge({ host: 'localhost' });

bridge.ready(function() {
  bridge.publishService('placefinder', {
    geocode: function(location, flags, appId) {
      request('http://where.yahooapis.com/geocode?location=' + location + '&flags=' + flags + '&appid=' + appId, function (error, response, body) {
        console.log(response);
      });
    }
  });
  
  setTimeout(function() {
    bridge.getService('placefinder', function(service) {
      service.geocode("San Francisco, CA", "P", "IxmcUg3c")
    });
  }, 2000);
});

// bridge.ready(function() {
//   bridge.joinChannel('eric', {
//     say: function(str, name) {
//       console.log(name + " says " + str);
//     }
//   });
//   
//   var channel = null;
//   setInterval(function() {
//     if (channel == null) {
//       bridge.getChannel('eric', function(eric) {
//         channel = eric;
//         eric.say('hello', 'ritik');
//       });
//     } else {
//       channel.say('hello', 'ritik');
//     }
//   }, 5000);
// });