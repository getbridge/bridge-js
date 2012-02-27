// if node
var util = require('./util');
var url = require('url');
var http = require('http');
var Serializer = require('./serializer.js');
var TCP = require('./tcp').TCP;
// end node

function Connection(Bridge) {
  var self = this;
  // Set associated Bridge object
  this.Bridge = Bridge;
  // Set options
  this.options = Bridge.options;
  if (!this.options.host || !this.options.port) {
    // Find host and port with redirector
    if (this.options.tcp) {
      var redirector = url.parse(this.options.redirector);
      http.get({
        host: redirector.hostname,
        port: redirector.port,
        path: '/redirect/' + this.options.apiKey
      }, function(res) {
        var data = "";
        res.on('data', function(chunk){
          data += chunk;
        });
        res.on('end', function(){
          try {
            var info = JSON.parse(data);
            self.options.host = info.data.bridge_host;
            self.options.port = info.data.bridge_port;
            if (!self.options.host || !self.options.port) {
              throw "Could not find host and port in JSON";
            }
            self.establishConnection();
          } catch (e) {
            util.error('Unable to parse redirector response ' + data);
          }
        });
      }).on('error', function(e) {
      throw e
        util.error('Unable to contact redirector');
      });
    } else {
      // JSONP
      window.bridgeHost = function(status, host, port){ 
        self.options.host = host;
        self.options.port = parseInt(port, 10);
        self.establishConnection();
        delete window.bridgeHost;
      };
      var s = document.createElement('script');
      s.setAttribute('src', this.options.redirector + '/redirect/' + this.options.apiKey + '/jsonp');
      document.getElementsByTagName('head')[0].appendChild(s);
    }
  } else {
    // Host and port is specified
    this.establishConnection();
  }

  

}

Connection.prototype.reconnect = function () {
  util.info("Attempting reconnect");
  var self = this;
  if (!this.connected && this.interval < 12800) {
    setTimeout(function(){self.establishConnection()}, this.interval *= 2);
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
    this.sock = new SockJS(this.options.protocol + this.options.host + ':' + this.options.port + '/bridge', this.options.protocols, this.options.sockjs);
  }
  
  this.sock.Bridge = Bridge;

  this.sock.onmessage = function (message) {
    var handleMessage = function(message){
      try {
        message = util.parse(message.data);
        util.info('Received', message);
        Bridge.onMessage(message);
      } catch (e) {
        util.error("Message parsing failed: ", e.message, e.stack);
      }
    };
    
    util.info("clientId and secret received", message.data);
    var ids = message.data.toString().split('|');
    if(ids.length !== 2) {
      handleMessage(message);
    } else {
      self.clientId = ids[0];
      self.secret = ids[1];
      self.interval = 400;
      self.sock.onmessage = handleMessage;
      Bridge.onReady();
    }
  };

  this.sock.onopen = function () {
    util.info("Beginning handshake");
    var msg = {command: 'CONNECT', data: {session: [self.clientId || null, self.secret || null], api_key: self.options.apiKey}};
    msg = util.stringify(msg);
    
    // If TCP use _send to force send bypassing connect check
    if (self.sock._send) {
      self.sock._send(msg);
    } else {
      self.sock.send(msg);
    }
    
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
  var msg = {command: 'GETCHANNEL', data: {name: name, callback: Serializer.serialize(this.Bridge, function(service, err) {
    if(err) {
      callback(null, err);
      return;
    }
    // Callback with channel ref
    callback(self.Bridge.getPathObj(['channel', name, 'channel:' + name])._setOps(service._operations), name);

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

Connection.prototype.leaveChannel = function (name, handler, callback) {
  // Adding other client is not supported
  var msg = {command: 'LEAVECHANNEL', data: {name: name, handler: Serializer.serialize(this.Bridge, handler), callback: Serializer.serialize(this.Bridge, callback)} };
  msg = util.stringify(msg);
  this.sock.send(msg);
};
// if node
exports.Connection = Connection;
// end node
