// if node
var util = require('./util.js');
// end node

var Serializer = {
  serialize: function(bridge, pivot) {
    var typ = util.typeOf(pivot);
    var result;
    switch(typ) {
      case 'object':
        if(pivot === null) {
          result = null;
        } else if ('_toDict' in pivot) {
          result = pivot._toDict();
        } else {
          var funcs = util.findOps(pivot)
          if (funcs.length > 0) {
            result = bridge._storeObject(pivot, funcs);
          } else {
            result = {};
            for (var key in pivot) {
              var val = pivot[key];
              result[key] = Serializer.serialize(bridge, val);
            }
          }
        }
        break;
      case 'array':
        result = [];
        for (var i = 0, ii = pivot.length; i < ii; i++) {
          var val = pivot[i];
          result.push(Serializer.serialize(bridge, val));
        }
        break;
      case 'function':
        if ( util.hasProp('_reference') ) {
          result = pivot._reference._toDict();
        } else {
          var ref = bridge._storeObject({callback: pivot}, ['callback']]);
          result = ref._toDict();
        }
        break;
      default:
        result = pivot;
    }
    return result;
  },
  unserialize: function(bridge, obj) {
    for(var key in obj) {
      var el = obj[key]
      if(typeof el === "object") {
        if(util.hasProp(el, 'ref')) {
          obj[key] = bridge.getPathObj(el['ref'])._setOps(el['operations']);
        } else {
          Serializer.unserialize(bridge, el);
        }
      }
    }
  }
};

// if node
module.exports = Serializer;
// end node
