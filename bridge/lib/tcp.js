var connect = require('net').connect;
var util = require('./util');

function TCP(options) {

  var buffer;
  var pos;
  var callback;
  
  // Start socket
  var sock = connect(options.port, options.host, function () {
    sock.setNoDelay(true);
    sock.on('data', sock.onchunk);
    sock.on('close', sock.onclose);
    sock.onopen();
  });

  sock.onchunk = function(data){
    var left = buffer.length - pos;
    if (data.length >= left) {
      data.copy(buffer, pos, 0, left);
      callback(buffer);
      sock.onchunk(data.slice(left));
    } else {
      data.copy(buffer, pos, 0, data.length);
      pos += data.length;
    }
  };
  
  sock.read = function(len, cb) {
    buffer = new Buffer(len);
    pos = 0;
    callback = cb;
  }
  
  sock.start = function() {
    // Read header bytes
    sock.read(4, function(buffer){
      // Read body bytes
      sock.read(buffer.readUInt32BE(0), function(buffer){
        // Call message handler
        sock.onmessage({data: buffer.toString()});
        // Await next message
        sock.start();
      });
    });
  }

  sock.send = function (data) {
    // Prepend length header to message
    var outstr = new Buffer( 'xxxx' + data );
    outstr.writeUInt32BE(Buffer.byteLength(data), 0);
    sock.write(outstr);
  }
  
  sock.start();
  
  this.sock = sock;
}

exports.TCP = TCP;
