var Serializer = require('./serializer');

function Client(bridge, id) {
  this._bridge = bridge;
  this.clientId = id;
}

Client.prototype.getService = function (svc, cb) {
  this._connection.sendCommand('GETOPS',
			       {name: svc, client: this.clientId, 
              callback: Serializer.serialize(this, cb)});
};
