var connect = require('net').connect;
var util = require('./util.js');

function TCP(options) {

  var left = 0;
  var chunk;

  var sock = connect(options.port, options.host, function () {
    sock.setNoDelay(true);
    sock.on('data', sock.onchunk);
    sock.on('close', sock.onclose);
    sock.onopen();
  });
  sock.onchunk = function(data){
    if (left == 0) {
      left = data.readUInt32BE(0);
      data = data.slice(4);
      chunk = "";
    }
    
    if (data.length < left) {
      chunk += data.toString();
      left -= data.length;
    } else if (data.length == left ) {
      chunk += data.toString();
      sock.onmessage({data: chunk});
      left = 0;
    } else if (data.length > left ) {
      chunk += data.toString('utf8', 0, left);
      sock.onmessage({data: chunk});
      data = data.slice(left);
      left = 0;
      sock.onchunk(data);
    }
    
    
  };
  sock.send = function (data) {
    if(sock.Bridge.connected) {
      sock._send(data);
    } else {
      throw "Not connected to server";
    }
  };
  
  sock._send = function (data) {
    util.info('Sending', data);
    var outstr = new Buffer( 'xxxx' + data );
    outstr.writeUInt32BE(Buffer.byteLength(data), 0);
    sock.write(outstr);
  }
  
  this.sock = sock;
}

exports.TCP = TCP;
