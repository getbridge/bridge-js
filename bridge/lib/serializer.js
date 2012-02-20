// if node
var util = require('./util.js');
// end node

var Serializer = {
  serialize: function(bridgeRoot, pivot) {
    var typ = util.typeOf(pivot);
    var result;
    switch(typ) {
      case 'object':
        var needs_wrap = false;
        var recurse_queue = [];
        var operations = [];
        var key, val;
        for (key in pivot) {
          var val = pivot[key];
          if ( typeof(val) === 'function' && util.isValid(key) ) {
            operations.push(key);
            needs_wrap = true;
          } else {
            recurse_queue.push(key);
          }
        }
        if ( pivot._getRef && util.typeOf(pivot._getRef) === 'function' ) {
          needs_wrap = true;
        }
        if (needs_wrap) {
          var ref;
          if (pivot._getRef && util.typeOf(pivot._getRef) === 'function') {
            ref = pivot._getRef();
          } else {
            ref = bridgeRoot.createCallback(pivot);
          }
          var target = ref._setOps(operations)._toDict();          
          result = target;
        } else {
          var tmp = {};
          for (pos in recurse_queue) {
            var key = recurse_queue[pos];
            var val = pivot[key];
            tmp[key] = Serializer.serialize(bridgeRoot, val);
          }
          result = tmp;
        }
        break;
      case 'array':
        var tmp = [];
        for (pos in pivot) {
          var val = pivot[pos];
          tmp.push(Serializer.serialize(bridgeRoot, val));
        }
        result = tmp;
        break;
      case 'function':
        var target;
        if ( pivot._getRef && util.typeOf(pivot._getRef) === 'function' ) {
          target = pivot._getRef()._toDict();
        } else {
          var wrap = function WrapDummy(){};
          wrap.callback = pivot;
          var ref = bridgeRoot.createCallback(wrap);
          target = ref.get('callback')._toDict();
        }
        result = target;
        break;
      default:
        result = pivot;
    }
    return result;
  },
  unserialize: function(bridgeRoot, obj) {
    for(var key in obj) {
      var el = obj[key]
      if(typeof el === "object") {
        if(util.hasProp(el, 'ref')) {
          obj[key] = bridgeRoot.getPathObj(el['ref'])._setOps(el['operations']);
        } else {
          Serializer.unserialize(bridgeRoot, el);
        }
      }
    }
  }
};

// if node
module.exports = Serializer;
// end node
