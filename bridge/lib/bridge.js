// if node
var util = require('./util.js');

var Connection = require('./connection.js').Connection;
var Serializer = require('./serializer.js');
var Ref = require('./ref.js');
// end node

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
      callback.call(this.children[name]);
    }
  }
  
  // Set configuration options
  this.options = options;
  
  // Contains references to shared references
  this.children = {system: system};
  
  // Indicate whether connected
  this.connected = false;
  
  // Communication layer
  this.connection = new Connection(this); 

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

  this.execute(pathchain, args);
};

Bridge.prototype.execute = function(pathchain, args) {

  var obj = this.children(pathchain[2]);

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
  
  if ( (!service._getRef) || (util.typeOf(service._getRef) != 'function') ) {
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
  if ( (!service._getRef) || (util.typeOf(service._getRef) != 'function') ) {
    var name = util.generateGuid();
    service._getRef = function() { return self.getPathObj( ['client', self.getClientId(), name] ); };
  } else {
    var name = service.getLocalName();
  }
  this.children[name] = service;
  return service._getRef();
};

Bridge.prototype.joinChannel = function(name, handler, callback) {
  var self = this;
  // Detect clientId of owning hander
  var foo = Serializer.serialize(this, handler);
  clientId = foo[1]['ref'][0];
  
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
}

Bridge.prototype.getRootRef = function() {
  return this.getPathObj(['client', this.getClientId()]);
}

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

// if node

exports.Bridge = Bridge;
// end node
