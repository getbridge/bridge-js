var defaultOptions = {
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
var Reference = require('./reference.js');

util.extend(defaultOptions, {
  /*port: 8090,*/
  tcp: true
});

// end node


function Bridge(options, callback) {

  var self = this;

  // Initialize system call service
  var system = {
    hookChannelHandler: function(name, handler, callback){
      var obj = self._store[handler._address[2]];
      self._store['channel:' + name] = obj;
      if (callback) {
        var ref = new Reference(self, ['channel', name, 'channel:' + name], util.findOps(obj));
        callback(ref, name);
      }
    },
    getService: function(name, callback){
      if (util.hasProp(self._store, name)) {
        callback(self._store[name], name);
      } else {
        callback(null, name);
      }
    },
    remoteError: function(msg) {
      util.warn(msg);
      self.emit('remoteError', [msg]);
    }
  };

  // Set configuration options
  this._options = util.extend(defaultOptions, options);

  // Set logging level
  util.setLogLevel(this._options.log);

  // Contains references to shared references
  this._store = {system: system};

  // Indicate whether connected
  this._ready = false;

  // Communication layer
  this._connection = new Connection(this);

  // Store event handlers
  this._events = {};
  
  if (callback) {
    this.ready(callback);
  }
}

Bridge.prototype._onReady = function() {
  util.info('Handshake complete');
  if (!this._ready) {
    this._ready = true;
    this.emit('ready');
  }
};

Bridge.prototype._execute = function(address, args) {
  var obj = this._store[address[2]];
  var func = obj[address[3]];
  if (func) {
    func.apply( obj, args );
  } else {
    // TODO: Throw exception
    util.warn('Could not find object to handle', address);
  }
};

Bridge.prototype._storeObject = function(handler, ops) {
  var name = util.generateGuid();
  this._store[name] = handler;
  return new Reference( this, ['client', this._connection.clientId, name], ops );
};



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

Bridge.prototype.send = function (args, destination) {
  this._connection.sendCommand('SEND', { 'args': Serializer.serialize(this, args), 'destination': destination});
};

Bridge.prototype.publishService = function (name, service, callback) {
  if (name === 'system') {
    util.error('Invalid service name: ' + name);
    return;
  }
  this._store[name] = service;
  this._connection.sendCommand('JOINWORKERPOOL', {name: name, callback: Serializer.serialize(this, callback)});
};

Bridge.prototype.getService = function (name, callback) {
  this._connection.sendCommand('GETOPS', {name: name, callback: Serializer.serialize(this, callback)});
};

Bridge.prototype.getChannel = function (name, callback) {
  var self = this;
  this._connection.sendCommand('GETCHANNEL', {name: name, callback: Serializer.serialize(this, function(service, err) {
    if (err) {
      callback(null, err);
      return;
    }
    // Callback with channel ref
    callback(new Reference(self.bridge, ['channel', name, 'channel:' + name], service._operations), name);
  })});
  
};

Bridge.prototype.joinChannel = function (name, handler, callback) {
  this._connection.sendCommand('JOINCHANNEL', {name: name, handler: Serializer.serialize(this, handler), callback: Serializer.serialize(this, callback)});
  
};

Bridge.prototype.leaveChannel = function (name, handler, callback) {
  this._connection.sendCommand('LEAVECHANNEL', {name: name, handler: Serializer.serialize(this, handler), callback: Serializer.serialize(this, callback)});
};

Bridge.prototype.ready = function(func) {
  if (!this._ready) {
    this.on('ready', func);
  } else {
    func();
  }
};

// if node

exports.Bridge = Bridge;
// end node
