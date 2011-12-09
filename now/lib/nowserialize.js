var util = require('./util.js');
var NowPath = require('./nowpath.js');

var NowSerialize = {
  serialize: function(nowRoot, pivot, links) {
    var typ = util.typeOf(pivot);
    var result;
    switch(typ) {
      case 'object':
        if (pivot._nowRef) {
          var target = pivot._nowRef.getRef();
          links[ target['ref'][0] ] = true;
          result = ['now', target ];
        } else {
          var tmp = {};
          for (pos in pivot) {
            var val = pivot[pos];
            tmp[pos] = NowSerialize.serialize(nowRoot, val, links);
          }
          result = ['list', tmp];
        }
        break;
      case 'array':
        var tmp = [];
        for (pos in pivot) {
          var val = pivot[pos];
          tmp.push(NowSerialize.serialize(nowRoot, val, links));
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
          wrap.handle_remote_call = pivot;
          var ref = nowRoot.doRegisterService(wrap);
          target = ref.getRef();
        }
        links[ target['ref'][0] ] = true;
        result = ['now', target ];
        break;
      case 'null':
        result = ['none', null];
        break;
      default:
        util.warn('Unknown', pivot, typ);
    }
    return result;
  },
  unserialize: function(nowRoot, tup) {
    var typ = tup[0];
    var pivot = tup[1];
    var result;
    switch(typ) {
      case "list":
        var tmp = [];
        for (pos in pivot) {
          tmp.push( NowSerialize.unserialize(nowRoot, pivot[pos] ) );
        }
        result = tmp;
        break;
      case "dict":
        var tmp = {};
        for (pos in pivot) {
          tmp[pos] = NowSerialize.unserialize(nowRoot, pivot[pos] );
        }
        result = tmp;
        break;
      case "str":
        result = pivot;
        break;
      case "float":
        result = pivot;
        break;
      case "now":
        result = new NowPath(nowRoot, pivot['ref']);
        break;
      case "none":
        break;
      default:
        util.warn('Unknown', pivot, typ)
    }
    return result;
  }
}

module.exports = NowSerialize;