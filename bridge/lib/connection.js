var defaultOptions = {
  url: 'http://localhost:8080/now',
  tcp: false
}

// if node
var util = require('./util');
var Serializer = require('./serializer.js');
var TCP = require('./tcp').TCP;
var defaultOptions = {
  host: 'localhost',
  port: 8090,
  tcp: true
}
// end node


function Connection(Bridge) {
  var self = this;

  // Set associated Bridge object
  this.Bridge = Bridge;
 
  // Merge passed in options into default options
  this.options = util.extend(defaultOptions, Bridge.options);

  // Select between TCP and SockJS transports
  if (this.options.tcp) {
    util.info('Starting TCP connection', this.options.host, this.options.port);
    this.sock = new TCP(this.options).sock;
  } else {
    util.info('Starting SockJS connection');
    this.sock = new SockJS(this.options.url, this.options.protocols, this.options.sockjs); 
  }
  
  this.sock.onopen = function() {
    util.info("Beginning handshake");
  };
  this.sock.onmessage = function(message){
    util.info("clientId and secret received", message.data);
    var ids = message.data.toString().split('|');
    self.clientId = ids[0];
    self.secret = ids[1];

    self.sock.onmessage = function(message){
      try {
        message = util.parse(message.data);    
        console.log('Received', message);
        Bridge.onMessage(message);
      } catch (e) {
        util.error("Message parsing failed: ", e.message, e.stack);
      }
    };
    Bridge.onReady();
  };
  this.sock.onclose = function() {
    util.warn("Connection closed");
  };
}

Connection.prototype.DEFAULT_EXCHANGE = 'T_DEFAULT';

Connection.prototype.getQueueName = function() {
  return 'C_' + this.clientId;
}

Connection.prototype.getExchangeName = function() {
  return 'T_' + this.clientId;
}


Connection.prototype.send = function(args, destination) {
  var msg = Serializer.serialize(this.Bridge, {command: 'SEND', data: { 'args': args, 'destination': destination}});
  msg = util.stringify(msg);
  this.sock.send(msg);
}

Connection.prototype.publishService = function(name, callback) {
  util.info('Joining worker pool', name);
  var msg = {command: 'JOINWORKERPOOL', data: {name: name, callback: callback} };
  msg = Serializer.serialize(this.Bridge, msg);
  msg = util.stringify(msg);
  this.sock.send(msg);
}

Connection.prototype.joinChannel = function(name, handler, callback) {
  // Adding other client is not supported
  var msg = {command: 'JOINCHANNEL', data: {name: name, handler: handler, callback: callback} };
  msg = Serializer.serialize(this.Bridge, msg);
  msg = util.stringify(msg);
  this.sock.send(msg);
}

// if node
exports.Connection = Connection;
// end node
