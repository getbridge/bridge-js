// if node
var util = require('./util.js');

var Connection = require('./connection.js').Connection;
var Serializer = require('./serializer.js');
var Ref = require('./ref.js');
// end node

// Simple queue for .ready handlers
var queue = [];

function Bridge(options) {
  
  // Set configuration options
  this.options = options;
  
  // Contains references to shared references
  this.children = {};
  
  // Indicate whether connected
  this.connected = false;
  
  // Communication layer
  this.connection = new BridgeConnection(this); 

};

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

  var unser = Serializer.unserialize(this, message);
  var destination = unser.destination;
  // util.info('DECODED: ', unser.args );
  if (!destination) {
    util.warn('No destination in message', unser);
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
  var self = this;
  if(typeof name !== "string" && typeof name !== "number") {
    service = name;
    name = undefined;
  }

  // var callback_wrap = Serializer.serialize(this, callback);
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

Bridge.prototype.joinChannel = function(name, clientId, callback) {
  var self = this;
  if(!clientId) {
    clientId = this.getClientId();
  }

  var handler;

  if(typeof clientId !== 'string' && typeof clientId !== 'number') {
    handler = clientId;
    var foo = Serializer.serialize(this, handler);
    clientId = foo[1]['ref'][0];
  }
  var callback_wrap = callback; //Serializer.serialize(this, callback);


  var handler_wrap = null;
  if (handler) {
    handler_wrap = handler; //Serializer.serialize(this, handler);
  }

  self.connection.joinChannel(this, name, clientId, handler_wrap, callback_wrap );
};

Bridge.prototype.execute = function(errcallback, bridgeref, args) {

  // System call
  if (bridgeref._pathchain[0] == 'system') {
    this.executeSystem(args);
  } else if ((bridgeref._pathchain[0] == this.getClientId()) || (bridgeref._pathchain[0] == 'local') ) {
    // Local function call
    if (bridgeref._pathchain[1] == 'channel') {
      this.executeLocal(['channel:' + bridgeref._pathchain[2]].concat( bridgeref._pathchain.slice(3) ), args, true);
    } else {
      this.executeLocal(bridgeref._pathchain.slice(1), args);
    }
  } else {
    this.connection.send( args, bridgeref, errcallback );
  }
};



/* Public APIs */
Bridge.prototype.ready = function(func) {
  if(!connected) {
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






// if node

exports.Bridge = Bridge;
// end node
