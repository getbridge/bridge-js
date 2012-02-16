// if node
var util = require('./util');
var Serializer = require('./serializer.js');
var TCP = require('./tcp').TCP;
// end node

function Connection(Bridge) {
  var self = this;
  // Set associated Bridge object
  this.Bridge = Bridge;

  // Set options
  this.options = Bridge.options;

  this.establishConnection();

}

Connection.prototype.reconnect = function () {
  util.info("Attempting reconnect");
  if (!this.connected && this.interval < 12800) {
    this.establishConnection();
    setTimeout(this.reconnect, this.interval *= 2);
  }
};

Connection.prototype.establishConnection = function () {
  var self = this,
      Bridge = this.Bridge;

  // Select between TCP and SockJS transports
  if (this.options.tcp) {
    util.info('Starting TCP connection', this.options.host, this.options.port);
    this.sock = new TCP(this.options).sock;
  } else {
    util.info('Starting SockJS connection');
    this.sock = new SockJS(this.options.url, this.options.protocols, this.options.sockjs);
  }

  this.sock.onmessage = function (message) {
    util.info("clientId and secret received", message.data);
    var ids = message.data.toString().split('|');
    self.clientId = ids[0];
    self.secret = ids[1];
    self.interval = 400;

    self.sock.onmessage = function(message){
      try {
        message = util.parse(message.data);    
        util.info('Received', message);
        Bridge.onMessage(message);
      } catch (e) {
        util.error("Message parsing failed: ", e.message, e.stack);
      }
    };
    Bridge.onReady();
  };
  
  this.sock.onopen = function () {
    util.info("Beginning handshake");
    var msg = {command: 'CONNECT', data: {session: [self.clientId || null, self.secret || null]}};
    msg = util.stringify(msg);
    self.sock.send(msg);
  };

  this.sock.onclose = function () {
    util.warn("Connection closed");
    self.connected = false;
    if (self.options.reconnect) {
      // do reconnect stuff. start at 100 ms.
      self.reconnect();
    }
  };
};

Connection.prototype.send = function (args, destination) {
  var msg = {command: 'SEND', data: { 'args': Serializer.serialize(this.Bridge, args), 'destination': Serializer.serialize(this.Bridge, destination)}};
  msg = util.stringify(msg);
  util.info('Sending', msg);
  this.sock.send(msg);
};

Connection.prototype.publishService = function (name, callback) {
  util.info('Joining worker pool', name);
  var msg = {command: 'JOINWORKERPOOL', data: {name: name, callback: Serializer.serialize(this.Bridge, callback)} };
  msg = util.stringify(msg);
  this.sock.send(msg);
};

Connection.prototype.getService = function (name, callback) {
  // Adding other client is not supported
  var msg = {command: 'GETOPS', data: {name: name, callback: Serializer.serialize(this.Bridge, callback)} };
  msg = util.stringify(msg);
  this.sock.send(msg);
};

Connection.prototype.getChannel = function (name, callback) {
  var self = this;
  // Adding other client is not supported
  var msg = {command: 'GETOPS', data: {name: 'channel:' + name, callback: Serializer.serialize(this.Bridge, function(service, err) {
    if(err) {
      callback(null, err);
      return;
    }
    // Callback with channel ref
    callback(self.Bridge.getPathObj(['channel', name, 'channel:' + name])._setOps(service._operations));
    
  }) }};
  msg = util.stringify(msg);
  this.sock.send(msg);
};

Connection.prototype.joinChannel = function (name, handler, callback) {
  // Adding other client is not supported
  var msg = {command: 'JOINCHANNEL', data: {name: name, handler: Serializer.serialize(this.Bridge, handler), callback: Serializer.serialize(this.Bridge, callback)} };
  msg = util.stringify(msg);
  this.sock.send(msg);
};

// if node
exports.Connection = Connection;
// end node
