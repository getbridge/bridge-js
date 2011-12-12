var util = require('./util.js');
var amqp = require('amqp');
var Connection = require('./connection.js');

var defaultOptions = {
  host: '192.168.2.109'
}

function AMQPConnection(onReady, onMessage, options) {
  var self = this;

  this.onMessage = onMessage;
  
  // Merge passed in options into default options
  this.options = util.extend(defaultOptions, options);
  this.client = amqp.createConnection({ host: this.options.host });
  this.client.on('ready', function() {
    // Generate UUID for client
    self.clientId = util.generateGuid();
    
    // Create default queue
    self.client.queue( self.getQueueName(), {autoDelete: false}, function(queue) {
      self.queue = queue;    
      // Consume from queue
      queue.subscribe(self.onData.bind(self));  
    });
    
    // Create default exchange
    self.client.exchange(self.getExchangeName(), {autoDelete: false, type:'topic'},  function (exchange) {
      self.client.exchange(self.DEFAULT_EXCHANGE, {autoDelete: false, type:'topic'}, function (defaultExchange) {
        self.exchange = exchange;
        self.defaultExchange = defaultExchange;
        // Exchange binding callback
        defaultExchange.on('exchangeBindOk', function(){
          onReady();
        });
        // Bind exchange to default exchange
        defaultExchange.bind(exchange, "N.#");
      });
    })
  });
  Connection.apply(this);
}

util.inherit(AMQPConnection, Connection);

AMQPConnection.prototype.onData = function(message, headers, deliveryInfo) {
  var self = this;
  try {
    var message = util.parse(message.data);    
    // Keep track of total number of links
    var total = 0;
    // Completed links
    var current = 0;
    
    for (key in headers) {
      if (key.substring(0,5) == 'link_') {
        total += 1;
        splitheader = headers[key].split('.');
        queue = this.client.queue('C_' + splitheader[0], {autoDelete: false}, function(){
          current += 1;
          if (current === total) {
            // All queues have been created, callback!
            self.onMessage(message);
          }
        });
        queue.bind(self.getExchangeName(), headers[key] + '.#');
      }
    }
    if (total === 0) {
      self.onMessage(message);
    }
  } catch (e) {
    util.error("Message parsing failed: ", e.message, e.stack);
  }
}

AMQPConnection.prototype.send = function(routingKey, message, links) {
  util.info('Sending', this.exchange.name, 'routing key', routingKey, message, links);
  // Adding links that need to be established to headers
  var headers = {};
  for (x in links) {
    headers['link_' + x] = links[x];
  }
  // Push message
  this.exchange.publish(routingKey, message, {
    headers: headers
  });
}

AMQPConnection.prototype.joinWorkerPool = function(name) {
  var self = this;
  var poolQueueName = 'W_' + name;
  this.client.queue(poolQueueName, {autoDelete: false}, function(queue) {
    util.info('Joined worker pool', name);
    queue.subscribe(self.onData.bind(self));
    // Bind messages targetted at pool
    queue.bind(self.DEFAULT_EXCHANGE, 'N.' + name + '.#');
  });
}

AMQPConnection.prototype.joinChannel = function(name, clientId) {
  var self = this;
  var channelExchangeName = 'F_' + name;
  self.client.queue( 'C_' + clientId, {autoDelete: false}, function(client_queue) {
    self.client.exchange('T_' + clientId, {autoDelete: false, type:'topic'},  function (client_exchange) {
      self.client.exchange(channelExchangeName, {autoDelete: false, type:'fanout'},  function (channel_exchange) {
        channel_exchange.bind(client_exchange, 'channel.' + name + '.#');
        client_queue.bind(channel_exchange, '#');
      });
    });
  });
}

module.exports = AMQPConnection;