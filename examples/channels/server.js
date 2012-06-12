var Bridge = require('bridge');

var authHandler = {
  join: function(obj, callback) {
    bridge.joinChannel('+rw', obj, callback);
    bridge.joinChannel('+r', obj, false, callback);
  }
};

var bridge = new Bridge({apiKey:'abcdefgh', host: 'localhost', port: 8090});
bridge.publishService('auth', authHandler);

bridge.connect();
