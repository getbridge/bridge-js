var defaultOptions = {
  protocol: 'http://',
  /*host: 'localhost',
  port: 8091,*/
  redirector: 'http://redirector.flotype.com',
  reconnect: true,
  log: 2,
  tcp: false
};


// if node
var util = require('./util.js');

var Connection = require('./connection.js').Connection;
var Serializer = require('./serializer.js');
var Ref = require('./ref.js');

util.extend(defaultOptions, {
  /*port: 8090,*/
  tcp: true
});

// end node


function Bridge(options) {

  var self = this;

  // Initialize system call service
  var system = {
    hook_channel_handler: function(name, handler, callback){
      self.children['channel:' + name] = self.children[handler._getRef()._pathchain[2]];
      if (callback) {
        var ref = self.getPathObj(['channel', name, 'channel:' + name]);
        ref._setOps(util.findKeys(self.children['channel:' + name]));
        callback.call( ref, name );
      }
    },
    getservice: function(name, callback){
      if (util.hasProp(self.children, name)) {
        callback.call(self.children[name]);
      } else {
        callback.call(null, "Cannot find service " + name);
      }
    },
    remoteError: function(msg) {
      util.warn(msg);
      self.emit('remoteError', [msg]);
    }
  };

  // Set configuration options
  this.options = util.extend(defaultOptions, options);

  // Set logging level
  util.setLogLevel(this.options.log);

  // Contains references to shared references
  this.children = {system: system};

  // Indicate whether connected
  this.connected = false;

  // Communication layer
  this.connection = new Connection(this);

  // Store event handlers
  this._events = {};
}

// Event emitter functions
Bridge.prototype.on = function (name, fn) {
  if (!(util.hasProp(this._events, name))) {
    this._events[name] = [];
  }
  this._events[name].push(fn);
  return this;
};

Bridge.prototype.emit = function (name, args) {
  if (util.hasProp(this._events, name)) {
    var events = this._events[name].slice(0);
    for (var i = 0, ii = events.length; i < ii; i++) {
      events[i].apply(this, args === undefined ? [] : args);
    }
  }
  return this;
};

Bridge.prototype.removeEvent = function (name, fn) {
  if (util.hasProp(this._events, name)) {
    for (var a = 0, l = this._events[name].length; a < l; a++) {
      if (this._events[name][a] === fn) {
        this._events[name].splice(a, 1);
      }
    }
  }
  return this;
};


Bridge.prototype.onReady = function() {
  util.info('Handshake complete');
  if(!this.connected) {
    this.connected = true;
    this.emit('ready');
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

  if(name === "system") {
    util.error("Invalid service name: " + name);
    return;
  }

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
  var ref;
  if ( (!service._getRef) || (util.typeOf(service._getRef) !== 'function') ) {
    name = util.generateGuid();
    ref = self.getPathObj( ['client', self.getClientId(), name] );
    this.children[name] = service;
  } else {
    ref = service._getRef();
  }
  return ref;
};

Bridge.prototype.joinChannel = function(name, handler, callback) {
  this.connection.joinChannel(name, handler, callback);
};

Bridge.prototype.leaveChannel = function(name, handler, callback) {
  this.connection.leaveChannel(name, handler, callback);
};

Bridge.prototype.send = function(args, destination) {
  this.connection.send(args, destination);
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


/* Public APIs */
Bridge.prototype.ready = function(func) {
  if(!this.connected) {
    this.on('ready', func);
  } else {
    func();
  }
};

Bridge.prototype.getClientId = function() {
  return this.connection.clientId;
};

Bridge.prototype.getService = function(name, callback) {
  this.connection.getService(name, callback);
};


Bridge.prototype.getChannel = function(name, callback) {
  this.connection.getChannel(name, callback);
};

// if node

exports.Bridge = Bridge;
// end node
