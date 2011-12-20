var defaultOptions = {
  url: 'http://localhost:8080/mqb'
}

// if node
var util = require('./util');
var createTCPConn = require('./tcp').createTCPConn
var Connection = require('./connection');
var use_tcp = true;
var defaultOptions = {
  host: 'localhost',
  port: 8090
}
// end node


function WebConnection(onReady, onMessage, options) {
  var self = this;

  this.onMessage = onMessage;
  
  // Merge passed in options into default options
  this.options = util.extend(defaultOptions, options);

  if (use_tcp) {
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

WebConnection.prototype.joinWorkerPool = function(name) {
  util.info('Joined worker pool', name);
  this.sock.send(util.stringify({type: 'joinWorkerPool', name: name}));
}

// TODO: Implement join channel callback
WebConnection.prototype.joinChannel = function(name) {
  // Adding other client is not supported
  this.sock.send(util.stringify({type: 'joinChannel', name: name}));
}

var NowConnection = WebConnection;

// if node
exports.NowConnection = NowConnection;
// end node