var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
bridge = new Bridge({host: 'localhost'});

var readline = require('readline');
rl = readline.createInterface(process.stdin, process.stdout);


var chat_handler = {
  handle_msg: function(name, message) {
    console.log('CHAT ' + name + ': ' + message);
  }
};

bridge.ready(function(){
  // rl.question("What is your name? ", function(username) {
  //   bridge.joinChannel('lobby', chat_handler, function(lobby, name){
  //     console.log('JOINED', name);
  //     rl.on('line', function(line) {
  //         lobby('msg').call(username, line);
  //     });
  //     rl.prompt();
  //   });
  // });
  
  var chat = bridge.getService('chat');
  //chat( 'doesnotexist' ).call_e( function(data){
  //  console.log('ERROR INFO', data);
  //}, 31337);

  chat('join').call('lobby', chat_handler, function(lobby, name) {
    console.log('JOIN SUCCESS', lobby, name);
    // lobby('msg').call_error( 'peter', 'hello');
  });
  // var foo = bridge.getService('foo');
  // bridge.getService('lala').call('har');
  // bridge.getPathObj(['frob', 'cow'], false).call('blah');
});
