/*! now.js build:0.0.1, development. Copyright(c) 2011 Flotype <team@flotype.com> MIT Licensed */
var log = console.log;

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
  
  stringify: JSON.stringify,
  parse: JSON.parse,
  
  log: log,
  
  error: log,
  warn: log,
  info: log
}

function CallQueue(callback){
  this.ready = false;
  this.queue = [];
  this.callback = callback;
};
CallQueue.prototype.onReady = function() {
  this.ready = true;
  this.process();
}
CallQueue.prototype.push = function() {
  this.queue.push( [].slice.apply(arguments) );
  if (this.ready) {
    this.process();
  }
}
CallQueue.prototype.process = function() {
  var oldQueue = this.queue;
  this.queue = [];
  for (var x in oldQueue) {
    this.callback.apply(null, oldQueue[x]);
  }
}

var NowPath = function(nowRoot, pathChain, named) {
    function NowPath() {
      var pathChain = arguments[0].split('.');
      return NowPath.nowRoot.getPathObj( NowPath.pathChain.concat(pathChain), NowPath.named );
    };
    NowPath.call = function() {
      var args = [].slice.apply(arguments);
      NowPath.nowRoot.funcCall(NowPath.pathChain, NowPath.named, args);                        
    }
    NowPath.getLocalName = function() {
      return NowPath.pathChain[1];
    };
    NowPath.getRef = function() {
      if (NowPath.pathChain[0] == 'local') {
        NowPath.pathChain[0] = NowPath.nowRoot.getClientId();
      }
      return {'ref': NowPath.pathChain};
    };

    // Set root Now object
    NowPath.nowRoot = nowRoot;
    NowPath.pathChain = pathChain;
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

/*Sockets*/

var Now = (function() {
    function Now(pathStr) {
      /* __call__ */
      var pathChain = pathStr.split('.');
      return Now.getPathObj( pathChain, true );
    };
    Now.getPathObj = function(pathChain, named) {
      return new NowPath(Now, pathChain, named);
    }
    Now.onMessage = function(message) {
      util.info('Message received: ', message);
      var pathChain = message.pathChain;

      if ( (pathChain[0] != Now.getClientId()) && (pathChain[0] != 'local') ) {
        pathChain.unshift(Now.getClientId());
      }
      var serargskwargs = message.serargskwargs;
      var commandArgs = NowSerialize.unserialize( Now, ["list", serargskwargs[0]] );
      var command_kwargs = NowSerialize.unserialize( Now, ["dict", serargskwargs[1]] );

      var ref = new NowPath(Now, pathChain);
      ref.call.apply(null, commandArgs);
    }
    Now.getClientId = function() {
      return Now.connection.clientId;
    };
    Now.executeLocal = function(args) {
      var pathChain = args[0];
      // if (pathChain[0])
      var commandArgs = args[1];
      var targetobj = Now.children[pathChain[0]];

      if (pathChain.length > 1) {
      } else {
        pathChain.push('remote_call');
      }
      var targetfun = targetobj[ 'handle_' + pathChain[1] ];
      if (targetfun) {
        targetfun.apply( targetobj, commandArgs );
      } else {
        util.warn('No Handler', pathChain);
      }
    };
    Now.executeSystem = function(args) {
      util.info('Execute system', args);
    };
    Now.registerService = function(service, name) {
      Now.callQueue.push('register_service', service, name);
    };
    Now.doRegisterService = function(service, name) {
      if (!service._nowRef) {
        if (!name) {
          name = util.generateGuid();
        } else {
          Now.connection.joinWorkerPool(name);
        }
        service._nowRef = new NowPath(Now, [ 'local', name ])
      } else {
        if (name) {
          util.error("Service can't be renamed!")
        } else {
          name = service._nowRef.getLocalName()
        }
      }
      Now.children[name] = service;
      return service._nowRef;
    };
    
    
    Now.execute = function(args) {
      
      var pathChain = args[0];
      var named = args[1];
      var commandArgs = args[2];
      // System call
      if (pathChain[0] == 'system') {
        Now.executeSystem(commandArgs);
      }
      
      if ((pathChain[0] == Now.getClientId()) || (pathChain[0] == 'local') ) {
        // Local function call
        Now.executeLocal([pathChain.slice(1), commandArgs] );
      } else {
        var links = {};
        var serargskwargs = [NowSerialize.serialize(Now, commandArgs, links)[1], {} ];
        var packet = {'serargskwargs': serargskwargs, 'pathChain': pathChain};
        
        // Set proper routing keys
        if (named) {
          var routingKey = 'N.' + pathChain[0];
        } else {
          var routingKey = pathChain[0];
        }
        Now.connection.send(routingKey, util.stringify(packet), util.getKeys(links));
      }
    };
    
    // Callback to handle queued commands
    Now.queueCallback = function() {
      var args = [].slice.apply(arguments);
      if (args[0] == 'execute') {
        // Execute remote call
        Now.execute( args.slice(1) );
      } else if (args[0] == 'register_service') {
        // Register a service
        Now.doRegisterService(args[1], args[2]);
      } else {
        util.warn('UNKNOWN QUEUED COMMAND');
      }
    };
    
    // Handle function calls
    Now.funcCall = function(pathChain, named, args) {
      // Add execute action to queue
      Now.callQueue.push('execute', pathChain, named, args);
    };
    
    // Create queue instance
    Now.callQueue = new CallQueue(Now.queueCallback);
    
    // Communication layer
    Now.connection = new NowConnection(function(){
      util.info('Connected');
      // Start processing queue
      Now.callQueue.onReady();
    }, Now.onMessage);
    
    Now.children = {};

    return Now;
});

