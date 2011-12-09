// if node
var util = require('./util.js');

var CallQueue = require('./callqueue.js');
var NowConnection = require('./nowconnection_amqp.js');
var NowSerialize = require('./nowserialize.js');
var NowPath = require('./nowpath.js');
// end node

var Now = (function() {
    function Now(pathStr) {
      /* __call__ */
      var pathChain = pathStr.split('.');
      return Now.getPathObj( pathChain, true );
    };
    Now.getPathObj = function(pathChain, named) {
      return new NowPath(Now, pathChain, named);
    }
    Now.onMessage = function(message) {
      util.info('Message received: ', message);
      var pathChain = message.pathChain;

      if ( (pathChain[0] != Now.getClientId()) && (pathChain[0] != 'local') ) {
        pathChain.unshift(Now.getClientId());
      }
      var serargskwargs = message.serargskwargs;
      var commandArgs = NowSerialize.unserialize( Now, ["list", serargskwargs[0]] );
      var command_kwargs = NowSerialize.unserialize( Now, ["dict", serargskwargs[1]] );

      var ref = new NowPath(Now, pathChain);
      ref.call.apply(null, commandArgs);
    }
    Now.getClientId = function() {
      return Now.connection.clientId;
    };
    Now.executeLocal = function(args) {
      var pathChain = args[0];
      // if (pathChain[0])
      var commandArgs = args[1];
      var targetobj = Now.children[pathChain[0]];

      if (pathChain.length > 1) {
      } else {
        pathChain.push('remote_call');
      }
      var targetfun = targetobj[ 'handle_' + pathChain[1] ];
      if (targetfun) {
        targetfun.apply( targetobj, commandArgs );
      } else {
        util.warn('No Handler', pathChain);
      }
    };
    Now.executeSystem = function(args) {
      util.info('Execute system', args);
    };
    Now.registerService = function(service, name) {
      Now.callQueue.push('register_service', service, name);
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
    
    
    Now.execute = function(args) {
      
      var pathChain = args[0];
      var named = args[1];
      var commandArgs = args[2];
      // System call
      if (pathChain[0] == 'system') {
        Now.executeSystem(commandArgs);
      }
      
      if ((pathChain[0] == Now.getClientId()) || (pathChain[0] == 'local') ) {
        // Local function call
        Now.executeLocal([pathChain.slice(1), commandArgs] );
      } else {
        var links = {};
        var serargskwargs = [NowSerialize.serialize(Now, commandArgs, links)[1], {} ];
        var packet = {'serargskwargs': serargskwargs, 'pathChain': pathChain};
        
        // Set proper routing keys
        if (named) {
          var routingKey = 'N.' + pathChain[0];
        } else {
          var routingKey = pathChain[0];
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
      } else if (args[0] == 'register_service') {
        // Register a service
        Now.doRegisterService(args[1], args[2]);
      } else {
        util.warn('UNKNOWN QUEUED COMMAND');
      }
    };
    
    // Handle function calls
    Now.funcCall = function(pathChain, named, args) {
      // Add execute action to queue
      Now.callQueue.push('execute', pathChain, named, args);
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
