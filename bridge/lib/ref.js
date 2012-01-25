var Ref = function (bridgeRoot, pathchain, operations) {
  function Ref() {
    var args = [].slice.apply(arguments);
    Ref.call.apply(Ref, args);
  };
  Ref._fixops = function() {
    for (x in Ref._operations) {
      var op = Ref._operations[x];
      console.log('FIXING', op);
      Ref[op] = Ref.get(op).call;
      Ref[op + '_e'] = Ref.get(op).call_e;
    }
  }
  Ref.get = function(pathadd) {
    var pathadd = pathadd.split('.');
    return Ref._bridgeRoot.getPathObj( Ref._pathchain.concat(pathadd) );
  }
  Ref.call = function() {
    var args = [].slice.apply(arguments);
    args.push(null); /* errcallback */
    return Ref.call_e.apply(Ref, args);
  }
  Ref.call_e = function() {
    var args = [].slice.apply(arguments);
    var errcallback = args.pop(); /* errcallback is always last arg */
    console.log('CALL_E', errcallback, Ref._pathchain, args);
    return Ref._bridgeRoot.execute(errcallback, Ref, args);
  }
  Ref.getLocalName = function() {
    return Ref._pathchain[1];
  };
  Ref._getRef = function(operations) {
    Ref._operations = operations;
    Ref._fixops();
    return Ref;
  }
  Ref.toDict = function() {
    if (Ref._pathchain[0] == 'local') {
      Ref._pathchain[0] = Ref._bridgeRoot.getClientId();
    }
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
