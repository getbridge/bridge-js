var util = require(__dirname + '/../../lib/util.js');
var Reference = require(__dirname + '/../../lib/reference.js');
var TCP = require(__dirname + '/../../lib/tcp.js').TCP;
var ConnectionDummy = require(__dirname + '/connection_dummy.js');
var assert = require('assert');

exports.testOnChunk = function () {
  var dummy = new ConnectionDummy();
  var tcp = new TCP({host: 'localhost', port: 8090});
  var sock = tcp.sock;
  sock.onopen = sock.onclose = function(){};
  var got = [];
  
  sock.onmessage = function(x) {
    got.push(x.data);
  }
  
  var messages = ['abc', 'efghij', 'klmnop', 'rs', 't', 'uvwxyz'];
    
  var messages_packed = [];
  for(var i in messages) {
    var msg = pack(messages[i]);
    messages_packed.push(msg);
    sock.onchunk(msg);
  }
  
    
  assert.eql(messages, got)
  
  for(var i = 0; i < 5; i++) {
    got = [];
    var message = messages_packed.join('');
    var pieces = Math.random() * (message.length-1) + 1;
    var each_piece = message.length / pieces;
    
    while (message.length > 0) {
      if(message.length > each_piece) {
        sock.onchunk(new Buffer(message.slice(0, each_piece)));
        message = message.slice(each_piece);
      } else {
        sock.onchunk(new Buffer(message));
        message = "";
      }
    }
  }  
    
  assert.eql(messages, got);
  
  sock.destroy();
};

function pack (data) {
  var outstr = new Buffer( 'xxxx' + data );
  outstr.writeUInt32BE(Buffer.byteLength(data), 0);
  return outstr;
}
