/*! bridge.js build:0.0.1, development. Copyright(c) 2011 Flotype <team@flotype.com> MIT Licensed */
var log;
if(window.console && console.log) {
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
    if(child === undefined || parent === undefined) return child;
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
    var S4 = function() {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return "" + S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4();
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
  getKeys: Object.keys || function(obj){
    var keys = [];
      for(var key in obj){
        keys.push(key);
      }
    return keys;
  },

  inherit: function (ctor, ctor2) {
    var f = function () {};
    f.prototype = ctor2.prototype;
    ctor.prototype = new f;
  },

  stringify: JSON.stringify,
  parse: JSON.parse,

  log: log,

  error: function(){
    util.log.apply(this, arguments);
  },
  warn: function(){
    util.log.apply(this, arguments);
  },
  info: function(){
    util.log.apply(this, arguments);
  }
};


var Ref = function (bridgeRoot, pathchain, operations) {
  function Ref() {
    var args = [].slice.apply(arguments);
    Ref.call.apply(Ref, args);
  }
  Ref._fixops = function() {
    for (var x in Ref._operations) {
      var op = Ref._operations[x];
      Ref[op] = Ref.get(op).call;
      Ref[op + '_e'] = Ref.get(op).call;
    }
  };
  Ref.get = function(pathadd) {
    var pathadd = pathadd.split('.');
    return Ref._bridgeRoot.getPathObj( Ref._pathchain.concat(pathadd) );
  };
  Ref.call = function() {
    var args = [].slice.apply(arguments);
    util.info('Calling', Ref._pathchain, args);
    return Ref._bridgeRoot.send(args, Ref);
  };
  Ref.getLocalName = function() {
    return Ref._pathchain[2];
  };
  Ref._getRef = function(operations) {
    Ref._operations = operations;
    Ref._fixops();
    return Ref;
  };
  Ref.toDict = function() {
    return {'ref': Ref._pathchain, 'operations': Ref._operations};
  };

  Ref._operations = operations || [];
  Ref._bridgeRoot = bridgeRoot;
  Ref._pathchain = pathchain;
  Ref._fixops();

  return Ref;
};


var Serializer = {
  serialize: function(bridgeRoot, pivot) {
    var typ = util.typeOf(pivot);
    var result;
    switch(typ) {
      case 'object':
        var needs_wrap = false;
        var recurse_queue = [];
        var operations = {};
        var key, val;
        for (key in pivot) {
          var val = pivot[key];
          if ( util.typeOf(val) == 'function' ) {
            operations[ key ] = true;
            needs_wrap = true;
          } else {
            recurse_queue.push(key);
          }
        }
        operations = util.getKeys(operations);
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
          var target = ref._getRef(operations).toDict();          
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
          target = pivot._getRef().toDict();
        } else {
          var wrap = function WrapDummy(){};
          wrap.callback = pivot;
          var ref = bridgeRoot.createCallback(wrap);
          target = ref.get('callback').toDict();
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
          obj[key] = bridgeRoot.getPathObj(el['ref'])._getRef(el['operations']);
        } else {
          Serializer.unserialize(bridgeRoot, el);
        }
      }
    }
  }
};

var defaultOptions = {
  url: 'http://localhost:8080/now',
  tcp: false
};


function Connection(Bridge) {
  var self = this;
  // Set associated Bridge object
  this.Bridge = Bridge;

  // Merge passed in options into default options
  this.options = util.extend(defaultOptions, Bridge.options);

  this.establishConnection();

}

Connection.prototype.DEFAULT_EXCHANGE = 'T_DEFAULT';

Connection.prototype.reconnect = function () {
  if (!this.connected && this.interval < 12800) {
    this.establishConnection();
    setTimeout(this.reconnect, this.interval *= 2);
  }
};

Connection.prototype.establishConnection = function () {
  var self = this,
      Bridge = this.Bridge;

  // Select between TCP and SockJS transports
  if (this.options.tcp) {
    util.info('Starting TCP connection', this.options.host, this.options.port);
    this.sock = new TCP(this.options).sock;
  } else {
    util.info('Starting SockJS connection');
    this.sock = new SockJS(this.options.url, this.options.protocols, this.options.sockjs);
  }

  this.sock.onmessage = function (message) {
    util.info("clientId and secret received", message.data);
    var ids = message.data.toString().split('|');
    self.clientId = ids[0];
    self.secret = ids[1];
    self.interval = 400;

    self.sock.onmessage = function(message){
      try {
        message = util.parse(message.data);    
        util.info('Received', message);
        Bridge.onMessage(message);
      } catch (e) {
        util.error("Message parsing failed: ", e.message, e.stack);
      }
    };
    Bridge.onReady();
  };
  
  this.sock.onopen = function () {
    util.info("Beginning handshake");
    var msg = {command: 'CONNECT', data: {session: [self.clientId || 0, self.secret || 0]}};
    msg = util.stringify(msg);
    self.sock.send(msg);
  };

  this.sock.onclose = function () {
    util.warn("Connection closed");
    self.connected = false;
    if (self.options.reconnect) {
      // do reconnect stuff. start at 100 ms.
      self.reconnect();
    }
  };
};

Connection.prototype.getQueueName = function () {
  return 'C_' + this.clientId;
};

Connection.prototype.getExchangeName = function () {
  return 'T_' + this.clientId;
};


Connection.prototype.send = function (args, destination) {
  var msg = {command: 'SEND', data: { 'args': Serializer.serialize(this.Bridge, args), 'destination': Serializer.serialize(this.Bridge, destination)}};
  msg = util.stringify(msg);
  util.info('Sending', msg);
  this.sock.send(msg);
};

Connection.prototype.publishService = function (name, callback) {
  util.info('Joining worker pool', name);
  var msg = {command: 'JOINWORKERPOOL', data: {name: name, callback: Serializer.serialize(this.Bridge, callback)} };
  msg = util.stringify(msg);
  this.sock.send(msg);
};

Connection.prototype.joinChannel = function (name, handler, callback) {
  // Adding other client is not supported
  var msg = {command: 'JOINCHANNEL', data: {name: name, handler: Serializer.serialize(this.Bridge, handler), callback: Serializer.serialize(this.Bridge, callback)} };
  msg = util.stringify(msg);
  this.sock.send(msg);
};


// Simple queue for .ready handlers
var queue = [];

function Bridge(options) {

  var self = this;


  // Initialize system call service
  var system = {
    hook_channel_handler: function(name, handler, callback){
      self.children['channel:' + name] = self.children[handler._getRef()._pathchain[2]];
      if (callback) {
        callback.call( self.getChannel(name), name );
      }
    },
    getservice: function(name, callback){
      callback.call(self.children[name]);
    }
  };

  // Set configuration options
  this.options = options;

  // Contains references to shared references
  this.children = {system: system};

  // Indicate whether connected
  this.connected = false;

  // Communication layer
  this.connection = new Connection(this);

}

Bridge.prototype.onReady = function() {
  util.info('Handshake complete');
  if(!this.connected) {
    this.connected = true;
    for(var i = 0, ii = queue.length; i < ii; i++) {
      queue[i]();
    }
  }
};

Bridge.prototype.onMessage = function(message) {
  Serializer.unserialize(this, message);
  var unser = message;
  var destination = unser.destination;
  // util.info('DECODED: ', unser.args );
  if (!destination) {
    util.warn('No destination in message', unser);
    return;
  }
  var pathchain = unser.destination._pathchain;
  var args = unser.args;

  this.execute(pathchain, args);
};

Bridge.prototype.execute = function(pathchain, args) {
  var obj = this.children[pathchain[2]];
  var func = obj[pathchain[3]];


  if (func) {
    func.apply( obj, args );
  } else {
    // TODO: Throw exception
    util.warn('No Func nor Default Handler for', pathchain);
  }
};


Bridge.prototype.publishService = function(name, service, callback) {
  var self = this;

  if ( (!service._getRef) || (util.typeOf(service._getRef) !== 'function') ) {
    service._getRef = function() { return self.getPathObj( ['named', name, name] ); };
    this.connection.publishService(name, callback);
  } else {
    util.error("Service can't be renamed! " + name + ' old ' +  service._getRef().getLocalName() );
    return;
  }
  this.children[name] = service;
  return service._getRef();
};

Bridge.prototype.createCallback = function(service) {
  var self = this;
  var name;
  if ( (!service._getRef) || (util.typeOf(service._getRef) !== 'function') ) {
    name = util.generateGuid();
    service._getRef = function() { return self.getPathObj( ['client', self.getClientId(), name] ); };
  } else {
    name = service.getLocalName();
  }
  this.children[name] = service;
  return service._getRef();
};

Bridge.prototype.joinChannel = function(name, handler, callback) {
  var self = this;
  // Detect clientId of owning hander
  
  
  var foo = Serializer.serialize(this, handler);
  var clientId = foo.ref[1];

  self.connection.joinChannel(name, handler, callback);
};

Bridge.prototype.send = function(args, destination) {
  this.connection.send(args, destination);
};

/* Public APIs */
Bridge.prototype.ready = function(func) {
  if(!this.connected) {
    queue.push(func);
  } else {
    func();
  }
};

Bridge.prototype.getClientId = function() {
  return this.connection.clientId;
};

Bridge.prototype.getPathObj = function(pathchain) {
  return new Ref(this, pathchain);
};

Bridge.prototype.getRootRef = function() {
  return this.getPathObj(['client', this.getClientId()]);
};

Bridge.prototype.get = function(pathStr)  {
  var pathchain = pathStr.split('.');
  return this.getPathObj(pathchain, true);
};

Bridge.prototype.getService = function(name, callback) {
  this.getPathObj(['named', name, 'system', 'getservice']).call(name, callback);
};

// Bridge.prototype.getClient = function(name) {
//   return this.getPathObj([name]);
// };

Bridge.prototype.getChannel = function(name) {
  return this.getPathObj(['channel', name, 'channel:' + name]);
};

