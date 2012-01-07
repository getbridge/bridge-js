var NowPath = function(nowRoot, pathchain) {
    function NowPath(path) {
      var pathchain = path.split('.');
      return NowPath.nowRoot.getPathObj( NowPath.pathchain.concat(pathchain) );
    };
    NowPath.call = function() {
      var args = [].slice.apply(arguments);
      return NowPath.call_e.apply(this, [null].concat(args) );
    }
    NowPath.call_e = function(errcallback) {
      var args = [].slice.apply(arguments);
      return NowPath.nowRoot.funcCall(errcallback, NowPath, args.slice(1));
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
  
    return NowPath;
};

// if node
module.exports = NowPath;
// end node
