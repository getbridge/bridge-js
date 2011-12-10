var NowPath = function(nowRoot, pathchain, named) {
    function NowPath() {
      var pathchain = arguments[0].split('.');
      return NowPath.nowRoot.getPathObj( NowPath.pathchain.concat(pathchain), NowPath.named );
    };
    NowPath.call = function() {
      var args = [].slice.apply(arguments);
      NowPath.nowRoot.funcCall(NowPath.pathchain, NowPath.named, args);                        
    }
    NowPath.getLocalName = function() {
      return NowPath.pathchain[1];
    };
    NowPath.getRef = function() {
      if (NowPath.pathchain[0] == 'local') {
        NowPath.pathchain[0] = NowPath.nowRoot.getClientId();
      }
      return {'ref': NowPath.pathchain};
    };

    // Set root Now object
    NowPath.nowRoot = nowRoot;
    NowPath.pathchain = pathchain;
    // Set whether is named (part of Now namespace)
    NowPath.named = named;
  
    return NowPath;
};

// if node
module.exports = NowPath;
// end node
