// if node
var util = require('./util');
var Serializer = require('./serializer');
var Reference = require('./reference');
var Connection = require('./connection').Connection;
// end node

/** 
 * <p>Create an instance of the Bridge object. This object will be used for Bridge interactions</p>
 * <p>{@link Bridge#connect} must be called to connect to the Bridge server</p>
 *
 * @param {Object} [options={"redirector": "http://redirector.flotype.com", "reconnect": true, "log": 2}]
 *   Options object passed to constructor to modify Bridge behavior
 *   <ul>
 *     <li><tt>redirector: 'http://redirector.flotype.com'</tt> Address to specify Bridge redirector server. The redirector server helps route the client to the appropriate Bridge server </li>
 *     <li><tt>reconnect: true</tt> Enable automatic reconnection to Bridge server</li>
 *     <li><tt>log: 2</tt> An integer specifying log level. 3 => Log all, 2 => Log warnings, 1 => Log errors, 0 => No logging output</li>
 *     <li><tt>host: undefined</tt> The hostname of the Bridge server to connect to. Overrides <tt>redirector</tt> when both <tt>host</tt> and <tt>port</tt> are specified</li>
 *     <li><tt>port: undefined</tt> An integer specifying the port of the Bridge server to connect to. Overrides <tt>redirector</tt> when both <tt>host</tt> and <tt>port</tt> are specified</li>
 *   </ul>
 * @constructor
 */  
function Bridge(options) {
  
  var self = this;
  
  // Set default options
  var defaultOptions = {
    redirector: 'http://redirector.flotype.com',
    reconnect: true,
    log: 2,
    tcp: false
  };

  // if node
  // Extend default options if platform is Node
  util.extend(defaultOptions, {
    /*port: 8090,*/
    tcp: true
  });
  // end node
  
  // Initialize system call service
  var system = {
    hookChannelHandler: function(name, handler, callback){
      // Retrieve requested handler
      var obj = self._store[handler._address[2]];
      // Store under channel name
      self._store['channel:' + name] = obj;
      if (callback) {
        // Send callback with reference to channel and handler operations
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

  this._options = util.extend(defaultOptions, options);

  util.setLogLevel(this._options.log);

  // Initialize system call service
  this._store = {system: system};

  // Indicates whether server is connected and handshaken
  this._ready = false;

  // Create connection object
  this._connection = new Connection(this);

  // Store event handlers
  this._events = {};

}

/**
 * @private
 */
Bridge.prototype._execute = function(address, args) {
  // Retrieve stored handler
  var obj = this._store[address[2]];
  // Retrieve function in handler
  var func = obj[address[3]];
  if (func) {
    func.apply( obj, args );
  } else {
    // TODO: Throw exception
    util.warn('Could not find object to handle', address);
  }
};

/**
 * @private
 */
Bridge.prototype._storeObject = function(handler, ops) {
  // Generate random id for callback being stored
  var name = util.generateGuid();
  this._store[name] = handler;
  // Return reference to stored callback
  return new Reference( this, ['client', this._connection.clientId, name], ops );
};



/**
 * <p>Add an event handler</p>
 *
 * @param {string} name Name of event
 * @param {array} fn handler function for event
 *
 * @function
 */
Bridge.prototype.on = function (name, fn) {
  if (!(util.hasProp(this._events, name))) {
    this._events[name] = [];
  }
  this._events[name].push(fn);
  return this;
};

/**
 * <p>Emits an event</p>
 *
 * @param {string} Name of event to emit
 * @param {array} [args=[]] Arguments to pass to event listeners
 *
 * @function
 * @private
 */
Bridge.prototype.emit = function (name, args) {
  if (util.hasProp(this._events, name)) {
    var events = this._events[name].slice(0);
    for (var i = 0, ii = events.length; i < ii; i++) {
      events[i].apply(this, args === undefined ? [] : args);
    }
  }
  return this;
};

/**
 * <p>Removes an event handler</p>
 *
 * @param {string} name Name of event
 * @param {array} fn handler function for event
 *
 * @function
 */
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

/**
 * @private
 */
Bridge.prototype._send = function (args, destination) {
  this._connection.sendCommand('SEND', { 'args': Serializer.serialize(this, args), 'destination': destination});
};

/** 
 * <p>Publishes a Javascript object as a Bridge service with the given name.</p>
 *
 * @param {string} name The name of the Bridge service the handler will be published with
 * @param {object} handler A Javascript object to publish 
 * @param {function(name)} [callback] Called with the name of the published service upon publish success
 * @function
 */  
Bridge.prototype.publishService = function (name, handler, callback) {
  if (name === 'system') {
    util.error('Invalid service name', name);
  } else {
  this._store[name] = handler;
  this._connection.sendCommand('JOINWORKERPOOL', {name: name, callback: Serializer.serialize(this, callback)});
  }
};

/** 
 * <p>Retrives a service published to Bridge with the given name.</p>
 * <p>If multiple Bridge clients have a published a service, the service is retrieved from one of the publishers round-robin.</p>
 *
 * @param {string} name The name of the Bridge service being requested
 * @param {function(service, name)} callback Called with the requested service and service name
 * @function
 */  
Bridge.prototype.getService = function (name, callback) {
  this._connection.sendCommand('GETOPS', {name: name, callback: Serializer.serialize(this, callback)});
};

/** 
 * <p>Retrives a channel from Bridge with the given name.</p>
 * <p>Calling a method on the channel object will result in the given method being executed on all clients that have been joined to the channel.</p>
 *
 * @param {string} name The name of the Bridge channel being requested
 * @param {function(channel, name)} callback Called with the requested channel and channel name
 * @function
 */ 
Bridge.prototype.getChannel = function (name, callback) {
  var self = this;
  this._connection.sendCommand('GETCHANNEL', {name: name, callback: Serializer.serialize(this, function(service, name) {
    name = name.split(':')[1];
    if (service === null) {
      callback(null, name);
      return;
    }
    // Callback with channel reference merged with operations from GETCHANNEL
    callback(new Reference(self, ['channel', name, 'channel:' + name], service._operations), name);
  })});
};

/** 
 * <p>Provides a remote object or Javascript object as a receiver for methods calls on a Bridge channel.</p>
 * <p>The given handler can be a remote object, in which case the Bridge client that created the remote object will be joined to the channel. Method calls to the channel will be not be proxied through this client but go directly to the source of the remote object.</p>
 *
 * @param {string} name The name of the Bridge channel the handler will recieve methods calls for
 * @param {object} handler A remote object or Javascript object to handle method calls from the channel
 * @param {function(channel, name)} [callback] Called with the joined channel and channel name upon success
 * @function
 */  
Bridge.prototype.joinChannel = function (name, handler, callback) {
  this._connection.sendCommand('JOINCHANNEL', {name: name, handler: Serializer.serialize(this, handler), callback: Serializer.serialize(this, callback)});
};

/** 
 * <p>Leaves a Bridge channel with the given name and handler object.</p>
 * <p>The given handler can be a remote object, in which case the Bridge client that created the remote object will be removed from the channel.</p>
 *
 * @param {string} name The name of the Bridge channel to leave
 * @param {object} handler A remote object or Javascript object that was used to handle moethod calls from the channel
 * @param {function(name)} [callback] Called with the name of the channel left
 * @function
 */  
Bridge.prototype.leaveChannel = function (name, handler, callback) {
  this._connection.sendCommand('LEAVECHANNEL', {name: name, handler: Serializer.serialize(this, handler), callback: Serializer.serialize(this, callback)});
};

/** 
 * <p>Calls the given callback when Bridge is connected and ready.</p>
 * <p>Calls the given callback immediately if Bridge is already ready</p>
 *
 * @param {function} callback Called when Bridge is connected and ready for use
 * @event
 */  
Bridge.prototype.ready = function (func) {
  if (!this._ready) {
    this.on('ready', func);
  } else {
    func();
  }
};

/** 
 * <p>Starts the connection to the Bridge server.</p>
 * <p>If a callback is given, calls the given callback when Bridge is connected and ready.</p>
 *
 * @param {function} [callback] Called when Bridge is connected and ready for use
 * @function
 */  
Bridge.prototype.connect = function (callback) {
  if (callback) {
    this.ready(callback);
  }  
  this._connection.start();
  return this;
};

// if node
module.exports = Bridge;
// end node
