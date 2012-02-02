var connect = require('net').connect;
var IOStream = require('iostream').IOStream;
var util = require('./util.js');

function TCP(options) {
  var sock = connect(options.port, options.host, function () {
    sock.setNoDelay(true);
    sock._iostream = new IOStream(sock);
    sock.on('close', sock.onclose);
    sock.onopen();
    sock.wait(sock.receive);
  });
  sock.wait = function (callback) {
    sock._iostream.read_bytes(4, function(data) {
      var bytecount = data.readUInt32BE(0);
      sock._iostream.read_bytes(bytecount, function(data) {
        callback(data);
      });
    });
  };

  sock.receive = function (data) {
    sock.onmessage({data: data.toString()});
    sock.wait(sock.receive);
  };

  sock.send = function (data) {
    util.info('Sending', data);
    var outstr = new Buffer( 'xxxx' + data );
    outstr.writeUInt32BE(Buffer.byteLength(data), 0);
    sock._iostream.write(outstr);
  };

  this.sock = sock;
}

exports.TCP = TCP;
