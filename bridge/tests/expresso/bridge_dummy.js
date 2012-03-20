var ReferenceDummy = require(__dirname + '/reference_dummy.js');

function BridgeDummy () {

  this.options = {
    redirector: 'http://redirector.flotype.com',
    reconnect: true,
    log: 2
  } 
  this.stored = [];
  
}

BridgeDummy.prototype._storeObject = function (handler, ops) {
  this.stored.push([handler, ops]);
  return new ReferenceDummy();
};

BridgeDummy.prototype._send = function (args, destination) {
  this.lastArgs = args;
  this.lastDest = destination;
};

module.exports = BridgeDummy;