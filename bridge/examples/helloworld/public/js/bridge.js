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

function CallQueue(Bridge){
  this._bridgeref = Bridge;
  this.ready = false;
  this.queue = [];
};
CallQueue.prototype.push = function(callback, args) {
  if (this.ready) {
    callback.apply(this._bridgeref, args);
  } else {
    this.queue.push( {callback: callback, args: args} );
  }
}

CallQueue.prototype.process = function() {
  this.ready = true;
  for (var i = 0, ii = this.queue.length; i < ii; i++) {
    this.queue[i].callback.apply(this._bridgeref, this.queue[i].args);
  }
  this.queue = [];
}

var BridgePath = function(bridgeRoot, pathchain) {
    function BridgePath(path) {
      return BridgePath.get(path);
    };
    BridgePath.get = function(path) {
      var pathchain = path.split('.');
      return BridgePath.bridgeRoot.getPathObj( BridgePath.pathchain.concat(pathchain) );      
    }
    BridgePath.call = function() {
      var args = [].slice.apply(arguments);
      return BridgePath.call_e.apply(this, [null].concat(args) );
    }
    BridgePath.call_e = function() {
      var args = [].slice.apply(arguments);
      return BridgePath.bridgeRoot.funcCall(args[0], BridgePath, args.slice(1));
    }
    BridgePath.getLocalName = function() {
      return BridgePath.pathchain[1];
    };
    BridgePath.getRef = function() {
      if (BridgePath.pathchain[0] == 'local') {
        BridgePath.pathchain[0] = BridgePath.bridgeRoot.getClientId();
      }
      return {'ref': BridgePath.pathchain};
    };

    // Set root Bridge object
    BridgePath.bridgeRoot = bridgeRoot;
    BridgePath.pathchain = pathchain;
  
    return BridgePath;
};


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
    self.sock._connid = ids[0];
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
    util.info('hi', message, message.data);
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

WebConnection.prototype.joinWorkerPool = function(bridgeobj, name, callback) {
  util.info('Joining worker pool', name, callback);
  var msg = {command: 'JOINWORKERPOOL', data: {name: name, handler: bridgeobj.getRootRef(), callback: callback} };
  msg = BridgeSerialize.serialize(bridgeobj, msg);
  msg = util.stringify(msg);
  // util.info('msg', msg);
  this.sock.send(msg);
}

WebConnection.prototype.joinChannel = function(nowobj, name, clientId, handler, callback) {
  // Adding other client is not supported
  var msg = {command: 'JOINCHANNEL', data: {name: name, handler: handler, callback: callback} };
  msg = BridgeSerialize.serialize(nowobj, msg);
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
};

Bridge.prototype.getPathObj = function(pathchain) {
  return new BridgePath(this, pathchain);
}

Bridge.prototype.getRootRef = function() {
  return new BridgePath(this, [this.connection.clientId], false);
}

Bridge.prototype.onMessage = function(message) {
  // util.info('Message received: ', message, typeof(message));
  var unser = BridgeSerialize.unserialize(this, message);

  var destination = unser.destination;
  util.info('Message received: ', unser, destination.pathchain);
  if (!destination) {
    util.warn('NO DESTINATION IN MESSAGE, IGNORING');
    return;
  }

  var pathchain = unser.destination.pathchain;
  var args = unser.args;

  // Add client Id so execute() treats the call as local
  if ((pathchain[0] != this.getClientId()) && (pathchain[0] != 'local')) {
    pathchain.unshift(this.getClientId());
  }
    
  var ref = new BridgePath(this, pathchain);
  ref.call.apply(null, args);
};

Bridge.prototype.getClientId = function() {
  return this.connection.clientId;
};

Bridge.prototype.executeLocal = function(pathchain, args) {
  var self = this;
  if (pathchain.length == 1) {
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
    pathchain.shift();
  }
  
  if (pathchain[0] === "system") {
    console.log('system message', pathchain.slice(1), args[0]);
    if (pathchain[1] == 'hook_channel_handler') {
      console.log('HOOK CHANNEL HANDLER', pathchain, args[0], args[1].getRef());
      self.children['channel:' + args[0]] = self.children[args[1].getRef()['ref'][1]];
      if (args[2]) {
        args[2].call( self.getChannel(args[0]), args[0] );
      }
    }
    return;
  }

  var targetobj = this.children[pathchain[0]] || this.children['default'];
  if (!targetobj) {
    throw new Error("No registered handler and no Default Handler for " + pathchain[0] + " !");
  }

  var target_funcname = 'handle_' + pathchain[1];

  var func = targetobj[target_funcname];
  if (!func) {
    func = targetobj['handle_default'];
    args.unshift(pathchain[1]);
  }
  
  if (func) {
    func.apply( targetobj, args );
  } else {
    util.warn('No Handler for', pathchain);
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
  if(typeof name !== "string" && typeof name !== "number") {
    service = name;
    name = undefined;
  }

  // var callback_wrap = BridgeSerialize.serialize(this, callback);
  var callback_wrap = callback;
  
  if (!service._bridgeRef) {
    if (!name) {
      name = util.generateGuid();
    } else {
      this.connection.joinWorkerPool(this, name, callback_wrap);
    }
    service._bridgeRef = new BridgePath(this, [ 'local', name ]);
  } else {
    if (name) {
      throw Error("Service can't be renamed! " + name + ' old ' +  service._bridgeRef.getLocalName() );
    } else {
      name = service._bridgeRef.getLocalName()
    }
  }
  this.children[name] = service;
  return service._bridgeRef;
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
  if (bridgeref.pathchain[0] == 'system') {
    this.executeSystem(commandArgs);
  }
  if ((bridgeref.pathchain[0] == this.getClientId()) || (bridgeref.pathchain[0] == 'local') ) {
    // Local function call
    if (bridgeref.pathchain[1] == 'channel') {
      this.executeLocal(['channel:' + bridgeref.pathchain[2]].concat( bridgeref.pathchain.slice(3) ), args);
    } else {
      this.executeLocal(bridgeref.pathchain.slice(1), args);
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

Bridge.prototype.get = function(pathStr)  {
  var pathchain = pathStr.split('.');
  return this.getPathObj(pathchain, true);
};

Bridge.prototype.getService = function(name) {
  return this.getPathObj(['named', name]);
};

Bridge.prototype.getClient = function(name) {
  return this.getPathObj([name], false);
};

Bridge.prototype.getChannel = function(name) {
  return this.getPathObj(['channel', name]);
};
  





