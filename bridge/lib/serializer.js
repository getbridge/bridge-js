// if node
var util = require('./util.js');
// end node

var Serializer = {
  serialize: function(bridgeRoot, pivot, links) {
    var typ = util.typeOf(pivot);
    var result;
    switch(typ) {
      case 'object':
        var needs_wrap = false;
        var recurse_queue = [];
        var operations = {};
        for (key in pivot) {
          var val = pivot[key];
          if ( (key.indexOf('handle_') == 0) && (util.typeOf(val) == 'function') ) {
            operations[ key.substr(7) ] = true;
            needs_wrap = true;
          } else {
            recurse_queue.push(key);
          }
        }
        operations = util.getKeys(operations);
        if ( pivot._getRef && util.typeOf(pivot._getRef) == 'function' ) {
          needs_wrap = true;
        }
        // console.log('found operations', operations);
        if (needs_wrap) {
          var ref;
          if (pivot._getRef && util.typeOf(pivot._getRef) == 'function') {
            ref = pivot._getRef();
          } else {
            ref = bridgeRoot.createCallback(pivot);
          }
          var target = ref._getRef(operations).toDict();
          if (links) {
            links[ target['ref'].join('.') ] = true;
          }
          result = ['now', target ];
        } else {
          var tmp = {};
          for (pos in recurse_queue) {
            var key = recurse_queue[pos];
            var val = pivot[key];
            tmp[key] = Serializer.serialize(bridgeRoot, val, links);
          }
          result = ['dict', tmp];
        }
        break;
      case 'array':
        var tmp = [];
        for (pos in pivot) {
          var val = pivot[pos];
          tmp.push(Serializer.serialize(bridgeRoot, val, links));
        }
        result = ['list', tmp];
        break;
      case 'string':
        result = ['str', pivot];
        break;
      case 'number':
        result = ['float', pivot];
        break;
      case 'function':
        var target;
        if ( pivot._getRef && util.typeOf(pivot._getRef) == 'function' ) {
          target = pivot._getRef().toDict();
        } else {
          var wrap = function WrapDummy(){};
          wrap.handle_default = pivot;
          var ref = bridgeRoot.createCallback(wrap);
          target = ref.toDict();
        }
        if (links) {
          links[ target['ref'].join('.') ] = true;
        }
        result = ['now', target ];
        break;
      case 'null':
        result = ['none', null];
        break;
      case 'undefined':
        result = ['none', null];
        break;
      case 'boolean':
        result = ['bool', pivot];
        break;
      default:
        util.warn('Unknown', pivot, typ);
    }
    return result;
  },
  unserialize: function(bridgeRoot, tup) {
    var typ = tup[0];
    var pivot = tup[1];
    var result;
    switch(typ) {
      case "list":
        var tmp = [];
        for (pos in pivot) {
          tmp.push( Serializer.unserialize(bridgeRoot, pivot[pos] ) );
        }
        result = tmp;
        break;
      case "dict":
        var tmp = {};
        for (pos in pivot) {
          tmp[pos] = Serializer.unserialize(bridgeRoot, pivot[pos] );
        }
        result = tmp;
        break;
      case "str":
        result = pivot;
        break;
      case "float":
        result = pivot;
        break;
      case "bool":
        result = Boolean(pivot);
        break;
      case "now":
        result = bridgeRoot.getPathObj(pivot['ref'])._getRef(pivot['operations']);
        break;
      case "none":
        result = null;
        break;
      default:
        util.warn('Unknown', tup)
    }
    return result;
  }
}

// if node
module.exports = Serializer;
// end node
