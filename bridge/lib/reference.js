// if node
var util = require('./util');
// end node

function Reference(bridge, address, operations) {
  var self = this;

  for (var key in operations) {
    var op = operations[key];
    if (op) {
      this[op] = (function(ref, op){
        return function() {
          var args = [].slice.apply(arguments);
          ref._call(op, args);
        }
      }(this, op));
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
  util.info('Calling', this._address + '.' + op);
  var destination = this._toDict(op);
  this._bridge.send(args, destination);
};


// if node
module.exports = Reference;
// end node

