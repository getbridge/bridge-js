var Bridge = require(__dirname + '/../../bridge').Bridge;
var http = require('http');
var request = require('request')

bridge = new Bridge({ host: 'localhost' });
var accessToken = "";

bridge.ready(function() {
  bridge.joinChannel('finance-LNKD', {
    
    price: function(ticker) {
      request("http://finance.yahoo.com/d/quotes.csv?s=" + ticker + "&f=l1", function (error, response, body) {
        body = body.replace(/(\r\n|\n|\r)/gm,"");
        console.log(body);
      })
    }
    
  }, function() {});
  
  var channel = null;
  
  setInterval(function() {
    if (channel == null) {
      bridge.getChannel('finance-LNKD', function (financeChannel) {
        channel = financeChannel;
        channel.price("LNKD");
      });
    } else {
      channel.price("LNKD");
    }
  }, 2000);
});
