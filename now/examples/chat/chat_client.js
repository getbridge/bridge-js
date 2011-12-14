var now = new (require('../..').Now)();

var handler = {
  channel_joined: function(name) {
    console.log('CALLBACK JOINED', name);
  },
  handle_receive: function(name, message) {
    console.log(name + ': ' + message);
  }
};

now.ready(function(){
  now.joinService('default', handler);
  now.joinChannel('lobby');
});

// now.ready(function(){
//   var chat = now.getService('chat');
//   chat('join').call('lobby', handler );
// });
