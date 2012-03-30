// if node
var util = require('./util');
var Reference = require('./reference');
// end node

var Serializer = {

  serialize: function(bridge, pivot) {
    var typ = util.typeOf(pivot);
    var result;
    switch(typ) {
      case 'object':
        if (pivot === null) {
          result = null;
        } else if ('_toDict' in pivot) {
          result = pivot._toDict();
        } else {
          var funcs = util.findOps(pivot)
          if (funcs.length > 0) {
            result = bridge._storeObject(pivot, funcs)._toDict();
          } else {
            // Enumerate hash and serialize each member
            result = {};
            for (var key in pivot) {
              var val = pivot[key];
              result[key] = Serializer.serialize(bridge, val);
            }
          }
        }
        break;
      case 'array':
        // Enumerate array and serialize each member
        result = [];
        for (var i = 0, ii = pivot.length; i < ii; i++) {
          var val = pivot[i];
          result.push(Serializer.serialize(bridge, val));
        }
        break;
      case 'function':
        if ( util.hasProp('_reference') ) {
          result = pivot._toDict();
        } else {
          result = bridge._storeObject({callback: pivot}, ['callback'])._toDict();
        }
        break;
      default:
        result = pivot;
    }
    return result;
  },
  
  unserialize: function(bridge, obj) {
    var result;
    for(var key in obj) {
      var el = obj[key]
      if (typeof el === 'object') {
        // If object has ref key, convert to reference
        if (util.hasProp(el, 'ref')) {
          // Create reference
          var ref = new Reference(bridge, el.ref, el.operations);
          if(el.operations && el.operations.length === 1 && el.operations[0] === 'callback') {
            // Create callback wrapper
            obj[key] = util.refCallback(ref);
          } else {
            obj[key] = ref;
          }
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