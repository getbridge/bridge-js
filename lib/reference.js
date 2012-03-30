// if node
var util = require('./util');
// end node

function Reference(bridge, address, operations) {
  var self = this;
  this._address = address;
  // For each supported operation, create a dummy function 
  // callable by user in order to start RPC call
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
  // Store operations supported by this reference if any
  this._operations = operations || [];
  this._bridge = bridge;
}

Reference.prototype._toDict = function(op) {
  // Serialize the reference
  var result = {};
  var address = this._address;
  // Add a method name to address if given
  if (op) {
    address = address.slice();
    address.push(op);
  }
  result.ref = address;
  // Append operations only if address refers to a handler
  if (address.length < 4 ) {
    result.operations = this._operations;
  }
  return result;
};

Reference.prototype._call = function(op, args) {
  util.info('Calling', this._address + '.' + op);
  var destination = this._toDict(op);
  this._bridge._send(args, destination);
};


// if node
module.exports = Reference;
// end node

