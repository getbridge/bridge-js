var defaultOptions = {
  url: 'http://localhost:8080/now',
  use_tcp: false
}

// if node
var util = require('./util');
var createTCPConn = require('./tcp').createTCPConn
var Connection = require('./connection');
var defaultOptions = {
  host: 'localhost',
  port: 8090,
  use_tcp: true
}
// end node


function WebConnection(onReady, onMessage, options) {
  var self = this;

  this.onMessage = onMessage;
  
  // Merge passed in options into default options
  this.options = util.extend(defaultOptions, options);

  if (this.options.use_tcp) {
    console.log('TCP CONN', this.options.host, this.options.port);
    this.sock = createTCPConn(this.options);
  } else {
    this.sock = new SockJS(this.options.url, this.options.protocols, this.options.sockjs); 
  }
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
    util.info('hi', message, message.data);
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

WebConnection.prototype.joinWorkerPool = function(name, callback) {
  util.info('Joining worker pool', name, callback);
  var msg = util.stringify({type: 'joinWorkerPool', name: name, callback: callback});
  // util.info('msg', msg);
  this.sock.send(msg);
}

// TODO: Implement join channel callback
WebConnection.prototype.joinChannel = function(name, clientId, callback) {
  // Adding other client is not supported
  var msg = util.stringify({type: 'joinChannel', name: name, callback: callback});
  // util.info('msg', msg);
  this.sock.send(msg);
}

var NowConnection = WebConnection;

// if node
exports.NowConnection = NowConnection;
// end node
