var util = require('./util.js');
var amqp = require('amqp');

function NowConnection(ready_callback, message_received) {
  this.ready_callback = ready_callback;
  this.message_received = message_received;

  this.connection_ready = this.connection_ready.bind(this);
  this.client_ready = this.client_ready.bind(this);
  this.datagram_received = this.datagram_received.bind(this);
  this.join_workerpool = this.join_workerpool.bind(this);

  this.client = amqp.createConnection({ host: '192.168.2.109' });

  this.client.on('ready', this.connection_ready);
  this.DEFAULT_EXCHANGE = 'D_DEFAULT';
}
NowConnection.prototype.get_queue_name = function() {
  return 'C_' + this.public_name;
}
NowConnection.prototype.get_exchange_name = function() {
  return 'T_' + this.public_name;
}
NowConnection.prototype.datagram_received = function(message, headers, deliveryInfo) {
  var message = JSON.parse(message.data);
  for (key in headers) {
    var tmax = 0;
    var cnt = 0;
    var already = false;
    if (key.substring(0,5) == 'link_') {
      tmax += 1;
      var q = this.client.queue('C_' + headers[key], {});
      q.on('queueBindOk', (function() {
        if ( (cnt == tmax) && (!already) ) {
          already = true;
          this.message_received(message);
        } else {
          cnt += 1;
        }
      }).bind(this));
      q.bind(this.get_exchange_name(), headers[key]);
    }
  }
  if ( (cnt == tmax) && (!already) ) {
    already = true;
    this.message_received(message);
  } else {
    cnt += 1;
  }
}
NowConnection.prototype.client_ready = function() {
  this.ready_callback();
}
NowConnection.prototype.send = function(routingKey, message, add_links) {
  console.log('sending', this.myexc.name, routingKey, message, add_links);
  var headers = {};
  for (x in add_links) {
    headers['link_' + x] = add_links[x];
  }
  this.myexc.publish(routingKey, message, {
    headers: headers
  });
}
NowConnection.prototype.join_workerpool = function(name) {
  var pool_queue_name = 'W_' + name;
  this.client.queue( pool_queue_name, {}, (function(poolq) {
    console.log('joined workerpool', name);
    poolq.subscribe(this.datagram_received);
    poolq.bind(this.DEFAULT_EXCHANGE, 'N.' + name);
  }).bind(this) );
}
NowConnection.prototype.connection_ready = function() {
  this.public_name = util.generateGuid();
  var q = this.client.queue( this.get_queue_name(), {}, (function(myq) {
    // console.log('queue created', this.get_queue_name());
    q.subscribe(this.datagram_received);

    this.myq = q;

    // console.log('trying to start exchange', this.get_exchange_name());
    this.client.exchange(this.get_exchange_name(), {autoDelete: false, type:'topic'},  (function (myexc) {
      this.client.exchange(this.DEFAULT_EXCHANGE, {autoDelete: false, type:'direct'},  (function (defexc) {
        this.myexc = myexc;
        this.defexc = defexc;

        // console.log('defined', myq.name, myexc.name, defexc.name);
        defexc.on('exchangeBindOk', (function(){
        this.client_ready();
        }).bind(this));
        defexc.bind(myexc, "N.*");
      }).bind(this));
    }).bind(this));
  }).bind(this));
}

module.exports = NowConnection;