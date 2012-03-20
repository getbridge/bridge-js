var connect = require('net').connect;
var util = require('./util');

function TCP(options) {

  var left = 0;
  var chunk = '';
  var headChunk = '';
  
  var sock = connect(options.port, options.host, function () {
    sock.setNoDelay(true);
    sock.on('data', sock.onchunk);
    sock.on('close', sock.onclose);
    sock.onopen();
  });

  sock.onchunk = function(data){
    data = data.toString();
    if (left == 0) {
      data = headChunk + data;
      if (data.length >= 4) {
      left = (new Buffer(data.slice(0, 4))).readUInt32BE(0);
      data = data.slice(4);
      chunk = '';
      headChunk = '';
      } else {
        headChunk = data;
        return;
      }
    }
    
    if (data.length < left) {
      chunk += data;
      left -= data.length;
    } else if (data.length == left ) {
      chunk += data;
      sock.onmessage({data: chunk});
      left = 0;
    } else if (data.length > left ) {
      chunk += data.slice(0, left);
      sock.onmessage({data: chunk});
      data = data.slice(left);
      left = 0;
      sock.onchunk(data);
    }  
  };
  
  sock.send = function (data) {
    var outstr = new Buffer( 'xxxx' + data );
    outstr.writeUInt32BE(Buffer.byteLength(data), 0);
    sock.write(outstr);
  }
  
  this.sock = sock;
}

exports.TCP = TCP;
