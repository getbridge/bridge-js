// if node
var Ser = require('./serializer');
// end node

var Client = function (bridge, id) {
  this._bridge = bridge;
  this.clientId = id;
};

Client.prototype.getService = function (svc, cb) {
  this._bridge._connection
      .sendCommand('GETOPS',
		   {name: svc, client: this.clientId,
		    callback: Ser.serialize(this._bridge, cb)});
};


// if node 
module.exports = Reference;
// end node
