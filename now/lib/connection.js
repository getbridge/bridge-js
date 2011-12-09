function Connection() {
  /* Connection base class */
}

Connection.prototype.DEFAULT_EXCHANGE = 'D_DEFAULT';

Connection.prototype.getQueueName = function() {
  return 'C_' + this.clientId;
}

Connection.prototype.getExchangeName = function() {
  return 'T_' + this.clientId;
}

// if node
module.exports = Connection;
// end node
