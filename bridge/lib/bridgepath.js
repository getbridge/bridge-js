var BridgePath = function(bridgeRoot, pathchain) {
    function BridgePath(path) {
      var pathchain = path.split('.');
      return BridgePath.bridgeRoot.getPathObj( BridgePath.pathchain.concat(pathchain) );
    };
    BridgePath.call = function() {
      var args = [].slice.apply(arguments);
      return BridgePath.call_e.apply(this, [null].concat(args) );
    }
    BridgePath.call_e = function(errcallback) {
      var args = [].slice.apply(arguments);
      return BridgePath.bridgeRoot.funcCall(errcallback, BridgePath, args.slice(1));
    }
    BridgePath.getLocalName = function() {
      return BridgePath.pathchain[1];
    };
    BridgePath.getRef = function() {
      if (BridgePath.pathchain[0] == 'local') {
        BridgePath.pathchain[0] = BridgePath.bridgeRoot.getClientId();
      }
      return {'ref': BridgePath.pathchain};
    };

    // Set root Bridge object
    BridgePath.bridgeRoot = bridgeRoot;
    BridgePath.pathchain = pathchain;
  
    return BridgePath;
};

// if node
module.exports = BridgePath;
// end node
