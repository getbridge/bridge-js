var Ref = function (bridgeRoot, pathchain, operations) {
  function Ref() {
    var args = [].slice.apply(arguments);
    Ref.call.apply(Ref, args);
  }
  Ref._fixops = function() {
    for (var x in Ref._operations) {
      var op = Ref._operations[x];
      console.log('FIXING', op);
      Ref[op] = Ref.get(op).call;
      Ref[op + '_e'] = Ref.get(op).call;
    }
  };
  Ref.get = function(pathadd) {
    var pathadd = pathadd.split('.');
    return Ref._bridgeRoot.getPathObj( Ref._pathchain.concat(pathadd) );
  };
  Ref.call = function() {
    var args = [].slice.apply(arguments);
    console.log('CALL_E', Ref._pathchain, args);
    return Ref._bridgeRoot.send(args, Ref);
  };
  Ref.getLocalName = function() {
    return Ref._pathchain[2];
  };
  Ref._getRef = function(operations) {
    Ref._operations = operations;
    Ref._fixops();
    return Ref;
  };
  Ref.toDict = function() {
    return {'ref': Ref._pathchain, 'operations': Ref._operations};
  };

  Ref._operations = operations || [];
  Ref._bridgeRoot = bridgeRoot;
  Ref._pathchain = pathchain;
  Ref._fixops();

  return Ref;
};

// if node
module.exports = Ref;
// end node
