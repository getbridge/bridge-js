var now = new (require('../..').Now)();

var chat_handler = {
  handle_receive: function(name, message) {
    console.log('CHAT ' + name + ': ' + message);
  }
};

now.ready(function(){
  now.joinChannel('lobby', chat_handler, function(name){ console.log('joined', name); } );
  var foo = now.getService('foo');
  foo('lala').call('blub');
});

// now.ready(function(){
//   var chat = now.getService('chat');
//   chat('join').call('lobby', handler );
// });
