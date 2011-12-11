// if node
var util = require('./util.js');

var CallQueue = require('./callqueue.js');
var NowConnection = require('./amqp.js');
var NowSerialize = require('./nowserialize.js');
var NowPath = require('./nowpath.js');
// end node

var Now = (function() {
    function Now(pathStr) {
      /* __call__ */
      var pathchain = pathStr.split('.');
      return Now.getPathObj( pathchain, true );
    };
    Now.getPathObj = function(pathchain, named) {
      return new NowPath(Now, pathchain, named);
    }
    Now.onMessage = function(message) {
      util.info('Message received: ', message);
      var pathchain = message.pathchain;

      if ( (pathchain[0] != Now.getClientId()) && (pathchain[0] != 'local') ) {
        pathchain.unshift(Now.getClientId());
      }
      var serargskwargs = message.serargskwargs;
      var commandArgs = NowSerialize.unserialize( Now, ["list", serargskwargs[0]] );
      var command_kwargs = NowSerialize.unserialize( Now, ["dict", serargskwargs[1]] );

      var ref = new NowPath(Now, pathchain);
      ref.call.apply(null, commandArgs);
    }
    Now.getClientId = function() {
      return Now.connection.clientId;
    };
    Now.executeLocal = function(args) {
      var pathchain = args[0];
      // if (pathchain[0])
      var commandArgs = args[1];
      var targetobj = Now.children[pathchain[0]];

      if (pathchain.length > 1) {
      } else {
        pathchain.push('remote_call');
      }
      var targetfun = targetobj[ 'handle_' + pathchain[1] ];
      if (targetfun) {
        targetfun.apply( targetobj, commandArgs );
      } else {
        util.warn('No Handler', pathchain);
      }
    };
    Now.executeSystem = function(args) {
      util.info('Execute system', args);
    };
    Now.registerService = function(service, name) {
      Now.callQueue.push('register_service', service, name);
    };
    Now.joinChannel = function(name, channel_handler) {
      Now.callQueue.push('join_channel', name, channel_handler);
    };
    Now.doRegisterService = function(service, name) {
      if (!service._nowRef) {
        if (!name) {
          name = util.generateGuid();
        } else {
          Now.connection.joinWorkerPool(name);
        }
        service._nowRef = new NowPath(Now, [ 'local', name ])
      } else {
        if (name) {
          util.error("Service can't be renamed!")
        } else {
          name = service._nowRef.getLocalName()
        }
      }
      Now.children[name] = service;
      return service._nowRef;
    };
    
    Now.doJoinChannel = function(name, channel_handler) {
      Now.registerService(channel_handler, 'channel:' + name);
      Now.connection.joinChannel(name, function() {
        var ref = Now.getPathObj( ['channel', name], false );
        channel_handler.joined.bind(channel_handler)(ref);
      });
    }
    
    Now.execute = function(args) {
      
      var pathchain = args[0];
      var named = args[1];
      var commandArgs = args[2];
      // System call
      if (pathchain[0] == 'system') {
        Now.executeSystem(commandArgs);
      }      
      if ((pathchain[0] == Now.getClientId()) || (pathchain[0] == 'local') ) {
        // Local function call
        if (pathchain[1] == 'channel') {
          Now.executeLocal([ ['channel:' + pathchain[2]].concat( pathchain.slice(3) ) , commandArgs] );
        } else {
          Now.executeLocal([pathchain.slice(1), commandArgs] );
        }
      } else {
        var links = {};
        var serargskwargs = [NowSerialize.serialize(Now, commandArgs, links)[1], {} ];
        var packet = {'serargskwargs': serargskwargs, 'pathchain': pathchain};
        
        // Set proper routing keys
        if (named) {
          var routingKey = 'N.' + pathchain.join('.');
        } else {
          var routingKey = pathchain.join('.');
        }
        Now.connection.send(routingKey, util.stringify(packet), util.getKeys(links));
      }
    };
    
    // Callback to handle queued commands
    Now.queueCallback = function() {
      var args = [].slice.apply(arguments);
      if (args[0] == 'execute') {
        // Execute remote call
        Now.execute( args.slice(1) );
      } else if (args[0] == 'join_channel') {
        Now.doJoinChannel(args[1], args[2]);
      } else if (args[0] == 'register_service') {
        // Register a service
        Now.doRegisterService(args[1], args[2]);
      } else {
        util.warn('UNKNOWN QUEUED COMMAND');
      }
    };
    
    // Handle function calls
    Now.funcCall = function(pathchain, named, args) {
      // Add execute action to queue
      Now.callQueue.push('execute', pathchain, named, args);
    };
    
    // Create queue instance
    Now.callQueue = new CallQueue(Now.queueCallback);
    
    // Communication layer
    Now.connection = new NowConnection(function(){
      util.info('Connected');
      // Start processing queue
      Now.callQueue.onReady();
    }, Now.onMessage);
    
    Now.children = {};

    return Now;
});

// if node
if (!module.parent) {
// this is the main module
  var now = new Now();

  HelloService = (function() {
    function HelloService() {}
    HelloService.prototype.handle_remote_call = function(msg, callback) {
      console.log("GREETING", msg);
      callback('lala');
    }
    return HelloService;
  })();

  hello = new HelloService();
  now.register_service(hello, 'hello');

  // now('local.hello.greet')();

  now('hello').call( 'http://slashdot.org/', function(msg) {
    console.log('MOEP', msg);
  });
  // now('webpull.fetch_url').call( 'http://slashdot.org/', function(body) {
  //     console.log('received body', body);
  // } );
} else {
  exports.Now = Now;
}
// end node
