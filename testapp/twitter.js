var Bridge = require(__dirname + '/../bridge').Bridge;
var request = require('request')

bridge = new Bridge({ host: 'localhost' });
var accessToken = "";

bridge.ready(function() {
  bridge.joinChannel('twitter-topic-LNKD', {
    
    stream: function(name) {
      request("http://search.twitter.com/search.json?q=" + name + "&rpp=5&include_entities=true&result_type=mixed", function (error, response, body) {
        console.log(body);
      });
    }
    
  }, function() {});
  
  var channel = null;
  
  setTimeout(function() {
    if (channel == null) {
      bridge.getChannel('twitter-topic-LNKD', function (twitterTopicChannel) {
        channel = twitterTopicChannel;
        channel.stream("LNKD");
      });
    } else {
      channel.stream("LNKD");
    }
  }, 2000);
  
});