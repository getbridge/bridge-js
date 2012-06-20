var Bridge = require('bridge');

// Specify secure as true in options to connect to Bridge Cloud over SSL
var bridge = new Bridge({apiKey: 'myapikey', 'secure':true});

bridge.connect();
