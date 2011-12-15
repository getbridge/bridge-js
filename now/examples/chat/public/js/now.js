/*! now.js build:0.0.1, development. Copyright(c) 2011 Flotype <team@flotype.com> MIT Licensed */
var log;
if(window.console && console.log) {
  log = function () { console.log.apply(console, arguments); };
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
  
  error: log,
  warn: log,
  info: log
}

function CallQueue(Now){
  this._nowref = Now;
  this.ready = false;
  this.queue = [];
};
CallQueue.prototype.push = function(callback, args) {
  if (this.ready) {
    callback.apply(this._nowref, args);
  } else {
    this.queue.push( {callback: callback, args: args} );
  }
}

CallQueue.prototype.process = function() {
  this.ready = true;
  for (var i = 0, ii = this.queue.length; i < ii; i++) {
    this.queue[i].callback.apply(this._nowref, this.queue[i].args);
  }
  this.queue = [];
}

var NowPath = function(nowRoot, pathchain, named) {
    function NowPath(path) {
      var pathchain = path.split('.');
      return NowPath.nowRoot.getPathObj( NowPath.pathchain.concat(pathchain), NowPath.named );
    };
    NowPath.call = function() {
      var args = [].slice.apply(arguments);
      NowPath.nowRoot.funcCall(NowPath.pathchain, NowPath.named, args);                        
    }
    NowPath.getLocalName = function() {
      return NowPath.pathchain[1];
    };
    NowPath.getRef = function() {
      if (NowPath.pathchain[0] == 'local') {
        NowPath.pathchain[0] = NowPath.nowRoot.getClientId();
      }
      return {'ref': NowPath.pathchain};
    };

    // Set root Now object
    NowPath.nowRoot = nowRoot;
    NowPath.pathchain = pathchain;
    // Set whether is named (part of Now namespace)
    NowPath.named = named;
  
    return NowPath;
};


var NowSerialize = {
  serialize: function(nowRoot, pivot, links) {
    var typ = util.typeOf(pivot);
    var result;
    switch(typ) {
      case 'object':
        if (pivot._nowRef) {
          var target = pivot._nowRef.getRef();
          links[ target['ref'].join('.') ] = true;
          result = ['now', target ];
        } else {
          var tmp = {};
          for (pos in pivot) {
            var val = pivot[pos];
            tmp[pos] = NowSerialize.serialize(nowRoot, val, links);
          }
          result = ['dict', tmp];
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
          wrap.handle_default = pivot;
          var ref = nowRoot.doJoinService(wrap);
          target = ref.getRef();
        }
        links[ target['ref'].join('.') ] = true;
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
      case "bool":
        result = Boolean(pivot);
        break;
      case "now":
        result = new NowPath(nowRoot, pivot['ref']);
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
  url: 'http://192.168.2.100:8080/mqb'
}

function WebConnection(onReady, onMessage, options) {
  var self = this;

  this.onMessage = onMessage;
  
  // Merge passed in options into default options
  this.options = util.extend(defaultOptions, options);
 
  this.sock = new SockJS(this.options.url, this.options.protocols, this.options.sockjs);
  this.sock.onopen = function() {
    self.clientId = self.sock._connid;
    onReady();
  };
  this.sock.onmessage = self.onData.bind(self);
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

WebConnection.prototype.send = function(routingKey, message, links) {
  util.info('Sending', routingKey, message, links);
  // Adding links that need to be established to headers
  var headers = {};
  for (x in links) {
    headers['link_' + x] = links[x];
  }
  // Push message
  this.sock.send(util.stringify({message: message, routingKey: routingKey, headers: headers}));
}

WebConnection.prototype.joinWorkerPool = function(name) {
  util.info('Joined worker pool', name);
  this.sock.send(util.stringify({type: 'joinWorkerPool', name: name}));
}

// TODO: Implement join channel callback
WebConnection.prototype.joinChannel = function(name) {
  // Adding other client is not supported
  this.sock.send(util.stringify({type: 'joinChannel', name: name}));
}

var NowConnection = WebConnection;


function Now(options) {
  var self = this;
  this.children = {};

  this.callQueue = new CallQueue(this);
  // Communication layer
  this.connection = new NowConnection(function(){
    util.info('Connected');
    // Start processing queue
    self.callQueue.process();
  }, this.onMessage.bind(this), options); 
};

Now.prototype.getPathObj = function(pathchain, named) {
  return new NowPath(this, pathchain, named);
}

Now.prototype.onMessage = function(message) {
  util.info('Message received: ', message);
  var pathchain = message.pathchain;

  // Add client Id so execute() treats the call as local
  if ((pathchain[0] != this.getClientId()) && (pathchain[0] != 'local')) {
    pathchain.unshift(this.getClientId());
  }
  
  var args = NowSerialize.unserialize( this, ["list", message.args] );
  
  var ref = new NowPath(this, pathchain);
  ref.call.apply(null, args);
};

Now.prototype.getClientId = function() {
  return this.connection.clientId;
};

Now.prototype.executeLocal = function(pathchain, args) {
  if (pathchain.length == 1) {
    
    if(util.hasProp(this.children, pathchain[0])) {
      // Is a callback
      pathchain.push('default');
    } else {
      // Is a method of default handler
      pathchain.unshift('default');
    }
  } else if (pathchain.length == 0) {
    pathchain = ['default', 'default'];
  }
  
  var targetobj = this.children[pathchain[0]] || this.children['default'];
  
  var func = targetobj['handle_' + pathchain[1]];
  
  if (func) {
    func.apply( targetobj, args );
  } else {
    util.warn('No Handler', pathchain);
  }
};

Now.prototype.executeSystem = function(args) {
  util.info('Execute system', args);
};

Now.prototype.joinService = function(name, service) {
  this.callQueue.push(this.doJoinService, [name, service]);
};

Now.prototype.joinChannel = function(name, clientId, handler) {
  this.callQueue.push(this.doJoinChannel, [name, clientId, handler]);
};

Now.prototype.doJoinService = function(name, service) {
  
  if(typeof name !== "string" && typeof name !== "number") {
    service = name;
    name = undefined;
  }
  
  if (!service._nowRef) {
    if (!name) {
      name = util.generateGuid();
    } else {
      this.connection.joinWorkerPool(name);
    }
    service._nowRef = new NowPath(this, [ 'local', name ]);
  } else {
    if (name) {
      util.error("Service can't be renamed!")
    } else {
      name = service._nowRef.getLocalName()
    }
  }
  this.children[name] = service;
  return service._nowRef;
};

Now.prototype.doJoinChannel = function(name, clientId, handler) {
  var self = this;
  if(!clientId) {
    clientId = this.getClientId();
  }
  
  if(typeof clientId !== 'string' && typeof clientId !== 'number') {
    handler = clientId;
    clientId = this.getClientId();
  }
  
  if(handler) {
    this.joinService('channel:' + name, handler);
  }
  
  this.connection.joinChannel(name, clientId, handler);
};

Now.prototype.execute = function(pathchain, named, args) {
  
  // System call
  if (pathchain[0] == 'system') {
    this.executeSystem(commandArgs);
  }
  if ((pathchain[0] == this.getClientId()) || (pathchain[0] == 'local') ) {
    // Local function call
    if (pathchain[1] == 'channel') {
      this.executeLocal(['channel:' + pathchain[2]].concat( pathchain.slice(3) ), args);
    } else {
      this.executeLocal(pathchain.slice(1), args);
    }
  } else {
    // Construct remote function
    var links = {};
    // Index 1 to get the value. Index 0 is the type (list)
    var serargs = NowSerialize.serialize(this, args, links)[1];
    var packet = {'args': serargs, 'pathchain': pathchain};
    
    // Set proper routing keys
    if (named) {
      var routingKey = 'N.' + pathchain.join('.');
    } else {
      var routingKey = pathchain.join('.');
    }
   this.connection.send(routingKey, util.stringify(packet), util.getKeys(links));
  }
};


// Handle function calls
Now.prototype.funcCall = function(pathchain, named, args) {
  // Add execute action to queue
  this.callQueue.push(this.execute, [pathchain, named, args]);
};

/* Public APIs */
Now.prototype.ready = function(func) {
  this.callQueue.push(func, []);
};

Now.prototype.get = function(pathStr)  {
  var pathchain = pathStr.split('.');
  return this.getPathObj(pathchain, true);
};

Now.prototype.getService = function(name) {
  return this.getPathObj([name], true);
};

Now.prototype.getClient = function(name) {
  return this.getPathObj([name], false);
};

Now.prototype.getChannel = function(name) {
  return this.getPathObj(['channel', name], false);
};
  






  //}
