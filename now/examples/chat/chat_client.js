var now = new (require('../..').Now)();
// var rl = require('readline');

var handler = {
  channel_joined: function(name) {
    console.log('CALLBACK JOINED', name);
  },
  handle_receive: function(name, message) {
    console.log(name + ': ' + message);
  }
};

now.ready(function(){
  now.joinService('default', handler, function() {
      console.log('JOINSERVICE SUCCESS');
  });
  now.joinChannel('lobby',  handler);
});

// now.ready(function(){
//   var chat = now.getService('chat');
//   chat('join').call('lobby', handler );
// });
