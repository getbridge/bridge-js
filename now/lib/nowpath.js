var NowPath = function(nowRoot, pathChain, named) {
    function NowPath() {
      var pathChain = arguments[0].split('.');
      return NowPath.nowRoot.getPathObj( NowPath.pathChain.concat(pathChain), NowPath.named );
    };
    NowPath.call = function() {
      var args = [].slice.apply(arguments);
      NowPath.nowRoot.funcCall(NowPath.pathChain, NowPath.named, args);                        
    }
    NowPath.getLocalName = function() {
      return NowPath.pathChain[1];
    };
    NowPath.getRef = function() {
      if (NowPath.pathChain[0] == 'local') {
        NowPath.pathChain[0] = NowPath.nowRoot.getClientId();
      }
      return {'ref': NowPath.pathChain};
    };

    // Set root Now object
    NowPath.nowRoot = nowRoot;
    NowPath.pathChain = pathChain;
    // Set whether is named (part of Now namespace)
    NowPath.named = named;
  
    return NowPath;
};

// if node
module.exports = NowPath;
// end node
