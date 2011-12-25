var now = new (require('../..').Now)();

var readline = require('readline');
rl = readline.createInterface(process.stdin, process.stdout);


var chat_handler = {
  handle_msg: function(name, message) {
    console.log('CHAT ' + name + ': ' + message);
  }
};

now.ready(function(){
  // rl.question("What is your name? ", function(username) {
  //   now.joinChannel('lobby', chat_handler, function(lobby, name){
  //     console.log('JOINED', name);
  //     rl.on('line', function(line) {
  //         lobby('msg').call(username, line);
  //     });
  //     rl.prompt();
  //   });
  // });
  var chat = now.getService('chat');
  chat('join').call('lobby', chat_handler, function(lobby, name) {
    lobby('msg').call('peter', 'hello');
  });
  // var foo = now.getService('foo');
  // now.getService('lala').call('har');
  // now.getPathObj(['frob', 'cow'], false).call('blah');
});
