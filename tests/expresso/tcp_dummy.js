function TcpDummy () {

}


TcpDummy.prototype.send = function () {
  this.lastSend = arguments;
};

module.exports = TcpDummy;