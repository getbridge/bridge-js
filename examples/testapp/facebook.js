var Bridge = require(__dirname + '/../bridge').Bridge;
var request = require('request')

bridge = new Bridge({ host: 'localhost' });
var accessToken = "";

bridge.ready(function() {
  bridge.publishService('facebook-graph', {
    
    auth: function(token) {
      accessToken = token;
      console.log("Authentication successful!");
    },
    
    feed: function(id) {
      request('https://graph.facebook.com/' + id + '/feed?access_token=' + accessToken, function (error, response, body) {
        console.log(body);
      });
    },
    
    
    
  });
  
  setTimeout(function() {
    bridge.getService('facebook-graph', function(service) {
      service.auth("AAACEdEose0cBABDnEfBmZC5dP0wwPBT9roQkrqd8uEvAAZAXW1Q8Eu7CADRlBJpc8JZAEvwoqjIZBAY41vzRNELiqo6UBGQZD");
      service.feed("516885724");
    });
  }, 2000);
});