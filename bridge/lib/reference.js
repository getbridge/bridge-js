// if node
var util = require('./util.js');
// end node


function Reference(bridge, address, operations) {
  var self = this;
  for (var key in operations) {
    var op = operations[key];
    if (op) {
      this[op] = util.opFunc(this, op);
    }
  }
  this._operations = operations || [];
  this._bridge = bridge;
  this._address = address;
}
Reference.prototype._toDict = function(op) {
  var result = {};
  var address = this._address;
  if (op) {
    address = address.slice();
    address.push(op);
  }
  result.ref = address;
  if (address.length < 4 ) {
    result.operations = this._operations;
  }
  return result;
};
Reference.prototype._call = function(op, args) {
  util.info('Calling', this._address, args);
  var destination = this._toDict(op);
  this._bridge.send(args, destination);
};
Reference.prototype._getObjectId = function() {
  return this._address[2];
};


// if node
module.exports = Reference;
// end node

