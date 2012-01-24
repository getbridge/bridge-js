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
    function f() {};
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
}

function CallQueue(Target){
  this._target = Target;
  this.ready = false;
  this.queue = [];
};
CallQueue.prototype.push = function(callback, args) {
  if (this.ready) {
    callback.apply(this._target, args);
  } else {
    this.queue.push( {callback: callback, args: args} );
  }
}

CallQueue.prototype.process = function() {
  this.ready = true;
  for (var i = 0, ii = this.queue.length; i < ii; i++) {
    this.queue[i].callback.apply(this._target, this.queue[i].args);
  }
  this.queue = [];
}

var BridgeRef = function (bridgeRoot, pathchain, operations) {
  function BridgeRef() {
    var args = [].slice.apply(arguments);
    BridgeRef.call.apply(BridgeRef, args);
  };
  BridgeRef._fixops = function() {
    for (x in BridgeRef._operations) {
      var op = BridgeRef._operations[x];
      console.log('FIXING', op);
      BridgeRef[op] = BridgeRef.get(op).call;
      BridgeRef[op + '_e'] = BridgeRef.get(op).call_e;
    }
  }
  BridgeRef.get = function(pathadd) {
    var pathadd = pathadd.split('.');
    return BridgeRef._bridgeRoot.getPathObj( BridgeRef._pathchain.concat(pathadd) );
  }
  BridgeRef.call = function() {
    var args = [].slice.apply(arguments);
    args.push(null); /* errcallback */
    return BridgeRef.call_e.apply(BridgeRef, args);
  }
  BridgeRef.call_e = function() {
    var args = [].slice.apply(arguments);
    var errcallback = args.pop(); /* errcallback is always last arg */
    console.log('CALL_E', errcallback, BridgeRef._pathchain, args);
    return BridgeRef._bridgeRoot.funcCall(errcallback, BridgeRef, args);
  }
  BridgeRef.getLocalName = function() {
    return BridgeRef._pathchain[1];
  };
  BridgeRef._getRef = function(operations) {
    BridgeRef._operations = operations;
    BridgeRef._fixops();
    return BridgeRef;
  }
  BridgeRef.toDict = function() {
    if (BridgeRef._pathchain[0] == 'local') {
      BridgeRef._pathchain[0] = BridgeRef._bridgeRoot.getClientId();
    }
    return {'ref': BridgeRef._pathchain, 'operations': BridgeRef._operations};
  };

  BridgeRef._operations = operations || [];
  BridgeRef._bridgeRoot = bridgeRoot;
  BridgeRef._pathchain = pathchain;
  BridgeRef._fixops();

  return BridgeRef;
};


var BridgeSerialize = {
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
            ref = bridgeRoot.doPublishService(pivot);
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
            tmp[key] = BridgeSerialize.serialize(bridgeRoot, val, links);
          }
          result = ['dict', tmp];
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
        if ( pivot._getRef && util.typeOf(pivot._getRef) == 'function' ) {
          target = pivot._getRef().toDict();
        } else {
          var wrap = function WrapDummy(){};
          wrap.handle_default = pivot;
          var ref = bridgeRoot.doPublishService(wrap);
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
        result = bridgeRoot.getPathObj(pivot['ref'])._getRef(pivot['operations']);
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

function Connection() {
  /* Connection base class */
}

Connection.prototype.DEFAULT_EXCHANGE = 'T_DEFAULT';

Connection.prototype.getQueueName = function() {
  return 'C_' + this.clientId;
}

Connection.prototype.getExchangeName = function() {
  return 'T_' + this.clientId;
}

var defaultOptions = {
  url: 'http://localhost:8080/now',
  use_tcp: false
}



function WebConnection(onReady, onMessage, options) {
  var self = this;

  this.onMessage = onMessage;

  // Merge passed in options into default options
  this.options = util.extend(defaultOptions, options);

  if (this.options.use_tcp) {
    console.log('TCP CONN', this.options.host, this.options.port);
    this.sock = createTCPConn(this.options);
  } else {
    this.sock = new SockJS(this.options.url, this.options.protocols, this.options.sockjs);
  }
  this.sock.onopen = function() {
    console.log("Waiting for clientId");

  };
  this.sock.onmessage = function(message){
    console.log("clientId======", message.data);
    var ids = message.data.toString().split('|');
    self.clientId = ids[0];
    self.secret = ids[1];

    self.sock.onmessage = self.onData.bind(self);
    onReady();
  };
  this.sock.onclose = function() {
    util.warn("WebConnection closed");
  };
}

util.inherit(WebConnection, Connection);

WebConnection.prototype.onData = function(message) {
  var self = this;
  try {
    var message = util.parse(message.data);
    self.onMessage(message);
  } catch (e) {
    util.error("Message parsing failed: ", e.message, e.stack);
  }
}

WebConnection.prototype.send = function(bridgeobj, message) {
  // Adding links that need to be established to headers
  // var headers = {};
  // for (x in links) {
  //   headers['link_' + x] = links[x];
  // }
  // Push message
  // this.sock.send(util.stringify({message: message, routingKey: routingKey, headers: headers}));
  var msg = BridgeSerialize.serialize(bridgeobj, {command: 'SEND', data: message});
  msg = util.stringify(msg);
  this.sock.send( msg );
}

WebConnection.prototype.joinWorkerPool = function(bridge, name, callback) {
  util.info('Joining worker pool', name);
  var msg = {command: 'JOINWORKERPOOL', data: {name: name, handler: bridge.getRootRef(), callback: callback} };
  msg = BridgeSerialize.serialize(bridge, msg);
  msg = util.stringify(msg);
  // util.info('msg', msg);
  this.sock.send(msg);
}

WebConnection.prototype.joinChannel = function(bridge, name, clientId, handler, callback) {
  // Adding other client is not supported
  var msg = {command: 'JOINCHANNEL', data: {name: name, handler: handler, callback: callback} };
  msg = BridgeSerialize.serialize(bridge, msg);
  msg = util.stringify(msg);
  // util.info('msg', msg);
  this.sock.send(msg);
}

var BridgeConnection = WebConnection;

// Browser compatibility shims

if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP
                                 ? this
                                 : oThis || window,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}


function Bridge(options) {
  var self = this;
  this.children = {};
  this.callQueue = new CallQueue(this);
  // Communication layer
  this.connection = new BridgeConnection(function(){
    util.info('Connected');
    // Start processing queue
    self.callQueue.process();
  }, this.onMessage.bind(this), options);
  this.getPathObj = this.getPathObj.bind(this);
};

Bridge.prototype.onMessage = function(message) {
  util.info('MESSAGE RECEIVED: ', JSON.stringify(message) );
  var unser = BridgeSerialize.unserialize(this, message);

  var destination = unser.destination;
  // util.info('DECODED: ', unser.args );
  if (!destination) {
    util.warn('NO DESTINATION IN MESSAGE, IGNORING');
    return;
  }

  var pathchain = unser.destination._pathchain;
  var args = unser.args;

  // Add client Id so execute() treats the call as local
  if ((pathchain[0] != this.getClientId()) && (pathchain[0] != 'local')) {
    pathchain.unshift(this.getClientId());
  }

  var ref = this.getPathObj(pathchain);
  ref.call.apply(ref, args);
};

Bridge.prototype.executeLocal = function(pathchain, args, ischannel) {
  var self = this;
  if ( (pathchain.length == 1) && (!ischannel) ) {
    if(util.hasProp(this.children, pathchain[0])) {
      // Have a reference for
      pathchain.push('default');
    } else {
      // Call on default handler
      pathchain.unshift('default');
    }
  } else if (pathchain.length == 0) {
    pathchain = ['default', 'default'];
  } else if (pathchain[0] === "named") {
    if (pathchain[2] == "system" ) {
      pathchain = ["system", pathchain[3], pathchain[1]];
    } else {
      pathchain.shift();
    }
  }

  console.log('checking for system', pathchain);
  if (pathchain[0] === "system") {
    console.log('system message', pathchain.slice(1), args[0]);
    if (pathchain[1] == 'hook_channel_handler') {
      console.log('HOOK CHANNEL HANDLER', pathchain, args[0], args[1]._getRef().toDict() );
      self.children['channel:' + args[0]] = self.children[args[1]._getRef()._pathchain[1]];
      if (args[2]) {
        args[2].call( self.getChannel(args[0]), args[0] );
      }
    } else if (pathchain[1] == 'getservice') {
      console.log('getservice', pathchain, args);
      args[0].call( this.children[pathchain[2]] );
    }
    return;
  }
  console.log('PATHCHAIN', pathchain, args);
  var targetobj = this.children[pathchain[0]] || this.children['default'];
  if (!targetobj) {
    throw new Error("No registered handler and no Default Handler for " + pathchain[0] + " !");
  }

  var target_funcname;
  if (pathchain[1]) {
    target_funcname = 'handle_' + pathchain[1];
  } else {
    target_funcname = 'handle_base';
  }
  console.log('finding func for', pathchain, 'is', target_funcname);

  var func = targetobj[target_funcname];
  if (!func) {
    util.warn('No Handler for', pathchain, '- trying default handler');
    func = targetobj['handle_default'];
    var default_target = pathchain[1] || 'base';
    args.unshift(default_target);
  }

  if (func) {
    func.apply( targetobj, args );
  } else {
    util.warn('No Func nor Default Handler for', pathchain);
  }
};

Bridge.prototype.executeSystem = function(args) {
  util.info('Execute system', args);
};

Bridge.prototype.registerDefault = function(service, callback) {
  this.children['default'] = service;
  if (callback) {
    callback();
  }
};

Bridge.prototype.publishService = function(name, service, callback) {
  this.callQueue.push(this.doPublishService, [name, service, callback]);
};

Bridge.prototype.joinChannel = function(name, clientId, handler) {
  this.callQueue.push(this.doJoinChannel, [name, clientId, handler]);
};

Bridge.prototype.doPublishService = function(name, service, callback) {
  var self = this;
  if(typeof name !== "string" && typeof name !== "number") {
    service = name;
    name = undefined;
  }

  // var callback_wrap = BridgeSerialize.serialize(this, callback);
  var callback_wrap = callback;

  if ( (!service._getRef) || (util.typeOf(service._getRef) != 'function') ) {
    if (!name) {
      name = util.generateGuid();
      service._getRef = function() { return self.getPathObj( ['local', name] ); };
    } else {
      service._getRef = function() { return self.getPathObj( ['local', name] ); };
      this.connection.joinWorkerPool(self, name, callback_wrap);
    }
  } else {
    if (name) {
      throw Error("Service can't be renamed! " + name + ' old ' +  service._getRef().getLocalName() );
    } else {
      name = service._getRef().getLocalName()
    }
  }
  self.children[name] = service;
  return service._getRef();
};

Bridge.prototype.doJoinChannel = function(name, clientId, callback) {
  var self = this;
  if(!clientId) {
    clientId = this.getClientId();
  }

  var handler;

  if(typeof clientId !== 'string' && typeof clientId !== 'number') {
    handler = clientId;
    var foo = BridgeSerialize.serialize(this, handler);
    clientId = foo[1]['ref'][0];
  }

  var callback_wrap = callback; //BridgeSerialize.serialize(this, callback);

  var handler_wrap = null;
  if (handler) {
    handler_wrap = handler; //BridgeSerialize.serialize(this, handler);
  }

  self.connection.joinChannel(this, name, clientId, handler_wrap, callback_wrap );
};

Bridge.prototype.execute = function(errcallback, bridgeref, args) {

  // System call
  if (bridgeref._pathchain[0] == 'system') {
    this.executeSystem(args);
  }
  if ((bridgeref._pathchain[0] == this.getClientId()) || (bridgeref._pathchain[0] == 'local') ) {
    // Local function call
    if (bridgeref._pathchain[1] == 'channel') {
      console.log('local channel exec', bridgeref._pathchain);
      this.executeLocal(['channel:' + bridgeref._pathchain[2]].concat( bridgeref._pathchain.slice(3) ), args, true);
    } else {
      this.executeLocal(bridgeref._pathchain.slice(1), args);
    }
  } else {
    // Construct remote function
    // var links = {};
    // Index 1 to get the value. Index 0 is the type (list)
    // var serargs = BridgeSerialize.serialize(this, args)[1];
    // var errcallback = BridgeSerialize.serialize(this, errcallback);
    var packet = { 'args': args, 'destination': bridgeref, 'errcallback': errcallback };

    // Set proper routing keys
    // if (named) {
    //   var routingKey = 'N.' + pathchain.join('.');
    // } else {
    //   var routingKey = pathchain.join('.');
    // }
   this.connection.send( this, packet );
   // console.log('not sending');
  }
};


// Handle function calls
Bridge.prototype.funcCall = function(errcallback, bridgeref, args) {
  // Add execute action to queue
  this.callQueue.push(this.execute, [errcallback, bridgeref, args]);
};

/* Public APIs */
Bridge.prototype.ready = function(func) {
  this.callQueue.push(func, []);
};

Bridge.prototype.getClientId = function() {
  return this.connection.clientId;
};

Bridge.prototype.getPathObj = function(pathchain) {
  return new BridgeRef(this, pathchain);
}

Bridge.prototype.getRootRef = function() {
  return this.getPathObj([this.getClientId()]);
}

Bridge.prototype.get = function(pathStr)  {
  var pathchain = pathStr.split('.');
  return this.getPathObj(pathchain, true);
};

Bridge.prototype.getService = function(name, callback, errcallback) {
  this.getPathObj(['named', name, 'system', 'getservice']).call_e(callback, errcallback);
};

// Bridge.prototype.getClient = function(name) {
//   return this.getPathObj([name]);
// };

Bridge.prototype.getChannel = function(name) {
  return this.getPathObj(['channel', name]);
};






