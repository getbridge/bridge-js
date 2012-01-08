// if node
var util = require('./util.js');

var CallQueue = require('./callqueue.js');
var BridgeConnection = require('./web.js').BridgeConnection;
var BridgeSerialize = require('./bridgeserialize.js');
var BridgePath = require('./bridgepath.js');
// end node


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
    var packet = { 'args': args, 'destination': bridgeref };
    
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
  





// if node

exports.Bridge = Bridge;
// end node
