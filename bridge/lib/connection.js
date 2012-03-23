// if node
var url = require('url');
var http = require('http');
var util = require('./util');
var Serializer = require('./serializer');
var TCP = require('./tcp').TCP;
// end node

function Connection(bridge) {
  var self = this;
  // Set associated bridge object
  this.bridge = bridge;
  // Set options
  this.options = bridge._options;
  
  this.sockBuffer = new SockBuffer();
  
  this.sock = this.sockBuffer;
  
  this.interval = 400;
}

Connection.prototype.redirector = function () {
  var self = this;
  // Find host and port with redirector
  if (this.options.tcp) {
    var redirector = url.parse(this.options.redirector);
    http.get({
      host: redirector.hostname,
      port: redirector.port,
      path: '/redirect/' + this.options.apiKey
    }, function (res) {
      var data = "";
      res.on('data', function (chunk){
        data += chunk;
      });
      res.on('end', function (){
        try {
          var info = JSON.parse(data);
          self.options.host = info.data.bridge_host;
          self.options.port = info.data.bridge_port;
          if (!self.options.host || !self.options.port) {
            util.error('Could not find host and port in JSON');
          } else {
            self.establishConnection();
          }
        } catch (e) {
          util.error('Unable to parse redirector response ' + data);
        }
      });
    }).on('error', function (e) {
      util.error('Unable to contact redirector');
    });
  } else {
    // JSONP
    window.bridgeHost = function (status, host, port){ 
      self.options.host = host;
      self.options.port = parseInt(port, 10);
      if (!self.options.host || !self.options.port) {
        util.error('Could not find host and port in JSON');
      } else {
        self.establishConnection();
      }
      delete window.bridgeHost;
    };
    var s = document.createElement('script');
    s.setAttribute('src', this.options.redirector + '/redirect/' + this.options.apiKey + '/jsonp');
    document.getElementsByTagName('head')[0].appendChild(s);
  }
}

Connection.prototype.reconnect = function () {
  util.info('Attempting reconnect');
  var self = this;
  if (this.interval < 32768) {
    setTimeout(function (){self.establishConnection()}, this.interval *= 2);
  }
};

Connection.prototype.establishConnection = function () {
  var self = this;
      
  var sock;
  // Select between TCP and SockJS transports
  if (this.options.tcp) {
    util.info('Starting TCP connection', this.options.host, this.options.port);
    sock = new TCP(this.options).sock;
  } else {
    util.info('Starting SockJS connection');
    sock = new SockJS('http://' + this.options.host + ':' + this.options.port + '/bridge', this.options.protocols, this.options.sockjs);
  }
  
  sock.bridge = this.bridge;
  sock.onmessage = function (message) {
    util.info('clientId and secret received', message.data);
    var ids = message.data.toString().split('|');
    if (ids.length !== 2) {
      self.processMessage(message);
    } else {
      self.clientId = ids[0];
      self.secret = ids[1];
      self.interval = 400;
      self.sock.processQueue(sock, self.clientId);
      self.sock = sock;
      self.sock.onmessage = self.processMessage;
      util.info('Handshake complete');
      if (!self.bridge._ready) {
        self.bridge._ready = true;
        self.bridge.emit('ready');
      }
    }
  };
  
  sock.onopen = function () {
    util.info('Beginning handshake');
    var msg = util.stringify({command: 'CONNECT', data: {session: [self.clientId || null, self.secret || null], api_key: self.options.apiKey} });
    sock.send(msg);
  };

  sock.onclose = function () {
    util.warn('Connection closed');
    self.sock = self.sockBuffer;
    
    if (self.options.reconnect) {
      // do reconnect stuff. start at 100 ms.
      self.reconnect();
    }
  };
};

Connection.prototype.processMessage = function (message) {
  try {
    util.info('Received', message.data);
    message = util.parse(message.data);
    Serializer.unserialize(this.bridge, message);
    var destination = message.destination;
    if (!destination) {
      util.warn('No destination in message', message);
      return;
    }
    this.bridge._execute(message.destination._address, message.args);
  } catch (e) {
    util.error('Message parsing failed: ', e.message, e.stack);
  }
};

Connection.prototype.sendCommand = function (command, data) {
  var msg = util.stringify({command: command, data: data });
  util.info('Sending', msg);
  this.sock.send(msg);
};

Connection.prototype.start = function () {
  if (!this.options.host || !this.options.port) {
    this.redirector();
  } else {
    // Host and port is specified
    this.establishConnection();
  }
};

function SockBuffer () {
  this.buffer = [];
}

SockBuffer.prototype.send = function(msg) {
  this.buffer.push(msg);  
};

SockBuffer.prototype.processQueue = function(sock, clientId) {
  for(var i = 0, ii = this.buffer.length; i < ii; i++) {
    sock.send(this.buffer[i].replace('"client",null', '"client","'+clientId+'"'));
  }
  this.buffer = [];
};

// if node
exports.Connection = Connection;
// end node
