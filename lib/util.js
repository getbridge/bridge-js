// if node
var window = global;

// end node

var log;
if (window.console && console.log) {
  log = function () {
    console.log.apply(console, arguments);
  };
} else {
  log = function noop () {};
}


var util = {
  
  hasProp: function (obj, prop) {
    return Object.prototype.hasOwnProperty.call(Object(obj), prop);
  },
  
  extend: function(child, parent) {
    if (child === undefined || parent === undefined) return child;
    for (var key in parent) {
      if (util.hasProp(parent, key)) child[key] = parent[key];
    }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  },
  
  generateGuid: function() {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
    for( var i = 0; i < 12; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
  },
  
  typeOf: function(value) {
    var s = typeof value;
    if (s === 'object') {
      if (value) {
        if (typeof value.length === 'number' &&
          !(value.propertyIsEnumerable('length')) &&
          typeof value.splice === 'function') {
          s = 'array';
        }
      } else {
        s = 'null';
      }
    }
    return s;
  },
  
  findOps: function(obj) {
    var result = [];
    for (var key in obj) {
      if (typeof(obj[key]) === 'function' && util.isValid(key)) {
        result.push(key);
      }
    }
    return result;
  },
  
  // Ignore private methods
  isValid: function(name) {
    return name.charAt(0) !== '_';
  },

  inherit: function (ctor, ctor2) {
    var f = function () {};
    f.prototype = ctor2.prototype;
    ctor.prototype = new f;
  },

  stringify: JSON.stringify,
  
  parse: JSON.parse,

  log: log,
  
  info: function(){
    util.log.apply(this, arguments);
  },
  
  warn: function(){
    util.log.apply(this, arguments);
  },
  
  error: function(){
    util.log.apply(this, arguments);
  },

  setLogLevel: function(level) {
    if (level < 3) {
      util.info = function(){};
    }
    if (level < 2) {
      util.warn = function(){};
    }
    if (level < 1) {
      util.error = function(){};
    }
  },
  
  refCallback: function(ref) {
    var func = function () {
      var args = [].slice.apply(arguments);
      ref._call('callback', args);
    }
    func._reference = ref;
    func._toDict = function(){
      return ref._toDict();
    }
    func.callback = func;
    return func;
  }
  
};

// if node
module.exports = util;
// end node