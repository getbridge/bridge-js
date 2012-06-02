var Serializer = require('./serializer');

function Client(bridge, id) {
  this._bridge = bridge;
  this.clientId = id;
}

Client.prototype.getService = function (svc, cb) {
  this._connection.sendCommand('GETOPS',
			       {name: ['client', this.clientId, 'system', 'getService'],
				callback: Serializer.serialize(this, cb)});
};
