var BridgeRef = function (bridgeRoot, pathchain, operations) {
  function BridgeRef() {
    var args = [].slice.apply(arguments);
    BridgeRef.call.apply(BridgeRef, args);
  };
  BridgeRef._fixops = function() {
    for (x in BridgeRef._operations) {
      var op = BridgeRef._operations[x];
      console.log('FIXING', op);
      BridgeRef[op] = BridgeRef.get(op).call;
      BridgeRef[op + '_e'] = BridgeRef.get(op).call_e;
    }
  }
  BridgeRef.get = function(pathadd) {
    var pathadd = pathadd.split('.');
    return BridgeRef._bridgeRoot.getPathObj( BridgeRef._pathchain.concat(pathadd) );      
  }
  BridgeRef.call = function() {
    var args = [].slice.apply(arguments);
    args.push(null); /* errcallback */
    return BridgeRef.call_e.apply(BridgeRef, args);
  }
  BridgeRef.call_e = function() {
    var args = [].slice.apply(arguments);
    var errcallback = args.pop(); /* errcallback is always last arg */
    console.log('CALL_E', errcallback, BridgeRef._pathchain, args);
    return BridgeRef._bridgeRoot.funcCall(errcallback, BridgeRef, args);
  }
  BridgeRef.getLocalName = function() {
    return BridgeRef._pathchain[1];
  };
  BridgeRef._getRef = function(operations) {
    BridgeRef._operations = operations;
    BridgeRef._fixops();
    return BridgeRef;
  }
  BridgeRef.toDict = function() {
    if (BridgeRef._pathchain[0] == 'local') {
      BridgeRef._pathchain[0] = BridgeRef._bridgeRoot.getClientId();
    }
    return {'ref': BridgeRef._pathchain, 'operations': BridgeRef._operations};
  };

  BridgeRef._operations = operations || [];
  BridgeRef._bridgeRoot = bridgeRoot;
  BridgeRef._pathchain = pathchain;
  BridgeRef._fixops();

  return BridgeRef;
};

// if node
module.exports = BridgeRef;
// end node
