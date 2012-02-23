// if node
var util = require('./util.js');
// end node

var Ref = function (bridgeRoot, pathchain, operations) {
  function Ref() {
    var args = [].slice.apply(arguments);
    Ref.call.apply(Ref, args);
  }
  Ref._fixOps = function() {
    for (var x in Ref._operations) {
      var op = Ref._operations[x];
      if (op !== null) {
        Ref[op] = Ref.get(op).call;
      }
    }
  };
  Ref._getRef = function(operations) {
    return Ref;
  };
  Ref._setOps = function(operations) {
    Ref._operations = operations;
    Ref._fixOps();
    return Ref;
  };
  Ref._toDict = function() {
    return {'ref': Ref._pathchain, 'operations': Ref._operations};
  };

  Ref.get = function(pathadd) {
    pathadd = pathadd.split('.');
    return Ref._bridgeRoot.getPathObj( Ref._pathchain.concat(pathadd) );
  };
  Ref.call = function() {
    var args = [].slice.apply(arguments);
    util.info('Calling', Ref._pathchain, args);
    return Ref._bridgeRoot.send(args, Ref);
  };
  Ref.getLocalName = function() {
    return Ref._pathchain[2];
  };

  Ref._operations = operations || [];
  Ref._bridgeRoot = bridgeRoot;
  Ref._pathchain = pathchain;
  Ref._fixOps();

  return Ref;
};

// if node
module.exports = Ref;
// end node
