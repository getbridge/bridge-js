var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
// bridge = new Bridge({host: 'ec2-50-19-181-20.compute-1.amazonaws.com'});

bridge = new Bridge({apiKey: 'abcdefgh'});




bridge.getService('chatserver', function(chat){

  chat.join('lobby', {
    msg: function(){
      console.log(arguments)
    }
  }, function(lobby){
    lobby.msg('hi');
  });
  
});

