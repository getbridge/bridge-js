var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;

bridge = new Bridge({host: 'localhost', port: 8090, apiKey: 'abcdefgh'});

bridge.ready(function(){

  var callback = function(){}

  var Handler = {
    someFn:function(){}
  }

  bridge.getService('someService', function(someService){
    someService.someFn(1, 1.0, 'foo', true, null, ['foo', 'bar'], {'foo':'bar'});
    someService.someFn(Handler, callback);
  });

  bridge.getChannel('someChannel', function(someChannel){
    someChannel.someFn(1, 1.0, 'foo', true, null, ['foo', 'bar'], {'foo':'bar'});
  });

  bridge.joinChannel('myChannel', Handler, callback);
  bridge.joinChannel('myChannel', Handler);

  bridge.publishService('myService', Handler, callback);
  bridge.publishService('myService', Handler);


});


