// if node
var util = require('./util.js');
// end node


function Reference(bridge, address, operations) {
  var self = this;
  for (var key in operations) {
    var op = operations[key];
    if (op) {
      this[op] = function() {
        var args = [].slice.apply(arguments);
        self.call(op, args);
      }
    }
  }
  this._operations = operations || [];
  this._bridge = bridge;
  this._address = address;
}
Reference.prototype._toDict = function() {
  return {'ref': this._address, 'operations': this._operations};
};
Reference.prototype._call = function(op, args) {
  util.info('Calling', this._address, args);
  var destination = this._address.slice();
  destination.push(op);
  this._bridge._connection.send(args, destination);
};
Reference.prototype._getObjectId = function() {
  return this._address[2];
};


// if node
module.exports = Reference;
// end node

