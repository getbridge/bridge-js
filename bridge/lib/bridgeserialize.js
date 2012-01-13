// if node
var util = require('./util.js');
var BridgePath = require('./bridgepath.js');
// end node

var BridgeSerialize = {
  serialize: function(bridgeRoot, pivot, links) {
    var typ = util.typeOf(pivot);
    var result;
    switch(typ) {
      case 'object':
        if (pivot._bridgeRef) {
          var target = pivot._bridgeRef.getRef();
          if (links) {
            links[ target['ref'].join('.') ] = true;
          }
          result = ['now', target ];
        } else {
          var needs_wrap = false;
          var recurse_queue = [];
          for (key in pivot) {
            var val = pivot[key];
            console.log('checking', key, val);
            if ( (key.indexOf('handle_') == 0) && (util.typeOf(val) == 'function') ) {
              needs_wrap = true;
            } else {
              recurse_queue.push(key);
            }
          }
          if (needs_wrap) {
            var ref = bridgeRoot.doPublishService(pivot);
            var target = ref.getRef();
            if (links) {
              links[ target['ref'].join('.') ] = true;
            }
            result = ['now', target ];
          } else {
            var tmp = {};
            for (pos in recurse_queue) {
              var key = recurse_queue[pos];
              var val = pivot[key];
              tmp[key] = BridgeSerialize.serialize(bridgeRoot, val, links);
            }
            result = ['dict', tmp];
          }
        }
        break;
      case 'array':
        var tmp = [];
        for (pos in pivot) {
          var val = pivot[pos];
          tmp.push(BridgeSerialize.serialize(bridgeRoot, val, links));
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
        if ( pivot.getRef ) {
          target = pivot.getRef();
        } else {
          var wrap = function WrapDummy(){};
          wrap.handle_default = pivot;
          var ref = bridgeRoot.doPublishService(wrap);
          target = ref.getRef();
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
          tmp.push( BridgeSerialize.unserialize(bridgeRoot, pivot[pos] ) );
        }
        result = tmp;
        break;
      case "dict":
        var tmp = {};
        for (pos in pivot) {
          tmp[pos] = BridgeSerialize.unserialize(bridgeRoot, pivot[pos] );
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
        result = new BridgePath(bridgeRoot, pivot['ref']);
        break;
      case "none":
        result = null;
        break;
      default:
        util.warn('Unknown', pivot, typ)
    }
    return result;
  }
}

// if node
module.exports = BridgeSerialize;
// end node
