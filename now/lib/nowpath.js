var NowPath = function(nowRoot, pathchain, named) {
    function NowPath(path) {
      var pathchain = path.split('.');
      return NowPath.nowRoot.getPathObj( NowPath.pathchain.concat(pathchain), NowPath.named );
    };
    NowPath.call = function() {
      return NowPath.call_e(null);
    }
    NowPath.call_e = function(errcallback) {
      var args = [].slice.apply(arguments);
      return NowPath.nowRoot.funcCall(errcallback, NowPath.pathchain, NowPath.named, args);
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
