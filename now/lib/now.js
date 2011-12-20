// if node
var util = require('./util.js');

var CallQueue = require('./callqueue.js');
var NowConnection = require('./web.js').NowConnection;
var NowSerialize = require('./nowserialize.js');
var NowPath = require('./nowpath.js');
// end node


function Now(options) {
  var self = this;
  this.children = {};

  this.callQueue = new CallQueue(this);
  // Communication layer
  this.connection = new NowConnection(function(){
    util.info('Connected');
    // Start processing queue
    self.callQueue.process();
  }, this.onMessage.bind(this), options); 
};

Now.prototype.getPathObj = function(pathchain, named) {
  return new NowPath(this, pathchain, named);
}

Now.prototype.onMessage = function(message) {
  util.info('Message received: ', message);
  var pathchain = message.pathchain;

  // Add client Id so execute() treats the call as local
  if ((pathchain[0] != this.getClientId()) && (pathchain[0] != 'local')) {
    pathchain.unshift(this.getClientId());
  }
  
  var args = NowSerialize.unserialize( this, ["list", message.args] );
  
  var ref = new NowPath(this, pathchain);
  ref.call.apply(null, args);
};

Now.prototype.getClientId = function() {
  return this.connection.clientId;
};

Now.prototype.executeLocal = function(pathchain, args) {
  var self = this;
  if (pathchain.length == 1) {
    if(util.hasProp(this.children, pathchain[0])) {
      // Have a reference for
      pathchain.push('default');
    } else {
      // Call on default handler
      pathchain.unshift('default');
    }
  } else if (pathchain.length == 0) {
    pathchain = ['default', 'default'];
  }
  
  if (pathchain[0] === "system") {
    console.log('system message', pathchain.slice(1), args[0]);
    if (pathchain[1] == 'hook_channel_handler') {
      self.children['channel:' + args[0]] = self.children[args[1].getRef()['ref'][1]];
    }
    return;
  }

  var targetobj = this.children[pathchain[0]] || this.children['default'];
  if (!targetobj) {
    throw new Error("No registered handler and no Default Handler!");
  }
  
  var func = targetobj['handle_' + pathchain[1]];
  
  if (func) {
    func.apply( targetobj, args );
  } else {
    util.warn('No Handler', pathchain);
  }
};

Now.prototype.executeSystem = function(args) {
  util.info('Execute system', args);
};

Now.prototype.joinService = function(name, service) {
  this.callQueue.push(this.doJoinService, [name, service]);
};

Now.prototype.joinChannel = function(name, clientId, handler) {
  this.callQueue.push(this.doJoinChannel, [name, clientId, handler]);
};

Now.prototype.doJoinService = function(name, service) {
  if(typeof name !== "string" && typeof name !== "number") {
    service = name;
    name = undefined;
  }
  
  if (!service._nowRef) {
    if (!name) {
      name = util.generateGuid();
    } else {
      this.connection.joinWorkerPool(name);
    }
    service._nowRef = new NowPath(this, [ 'local', name ]);
  } else {
    if (name) {
      throw Error("Service can't be renamed! " + name + ' old ' +  service._nowRef.getLocalName() );
    } else {
      name = service._nowRef.getLocalName()
    }
  }
  this.children[name] = service;
  return service._nowRef;
};

Now.prototype.doJoinChannel = function(name, clientId, handler) {
  var self = this;
  if(!clientId) {
    clientId = this.getClientId();
  }
  
  if(typeof clientId !== 'string' && typeof clientId !== 'number') {
    handler = clientId;
    var links = {};
    var foo = NowSerialize.serialize(this, handler, links);
    clientId = foo[1]['ref'][0];
  }
  
  if ( handler && (!self.connection.SUPPORTS_JOIN_CALLBACK) ) {
    self.children['channel:' + name] = handler;
  }

  self.connection.joinChannel(name, clientId, function(name) {
    console.log('JOIN CALLBACK SUCCEEDED', name);

    if (handler && (self.connection.SUPPORTS_JOIN_CALLBACK)) {
      if (clientId == self.getClientId()) {
        self.children['channel:' + name] = handler;
      } else {
        var args = [name, handler];
        var pathchain = [clientId, 'system', 'hook_channel_handler'];

        var links = {};
        // Index 1 to get the value. Index 0 is the type (list)
        var serargs = NowSerialize.serialize(self, args, links)[1];
        var packet = {'args': serargs, 'pathchain': pathchain};

        self.connection.send('C_' + clientId, util.stringify(packet), util.getKeys(links), true);
      }
    }
  });
};

Now.prototype.execute = function(pathchain, named, args) {
  
  // System call
  if (pathchain[0] == 'system') {
    this.executeSystem(commandArgs);
  }
  if ((pathchain[0] == this.getClientId()) || (pathchain[0] == 'local') ) {
    // Local function call
    if (pathchain[1] == 'channel') {
      this.executeLocal(['channel:' + pathchain[2]].concat( pathchain.slice(3) ), args);
    } else {
      this.executeLocal(pathchain.slice(1), args);
    }
  } else {
    // Construct remote function
    var links = {};
    // Index 1 to get the value. Index 0 is the type (list)
    var serargs = NowSerialize.serialize(this, args, links)[1];
    var packet = {'args': serargs, 'pathchain': pathchain};
    
    // Set proper routing keys
    if (named) {
      var routingKey = 'N.' + pathchain.join('.');
    } else {
      var routingKey = pathchain.join('.');
    }
   this.connection.send(routingKey, util.stringify(packet), util.getKeys(links), false);
  }
};


// Handle function calls
Now.prototype.funcCall = function(pathchain, named, args) {
  // Add execute action to queue
  this.callQueue.push(this.execute, [pathchain, named, args]);
};

/* Public APIs */
Now.prototype.ready = function(func) {
  this.callQueue.push(func, []);
};

Now.prototype.get = function(pathStr)  {
  var pathchain = pathStr.split('.');
  return this.getPathObj(pathchain, true);
};

Now.prototype.getService = function(name) {
  return this.getPathObj([name], true);
};

Now.prototype.getClient = function(name) {
  return this.getPathObj([name], false);
};

Now.prototype.getChannel = function(name) {
  return this.getPathObj(['channel', name], false);
};
  





// if node
/*if (!module.parent) {
// Now is the main module
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
} else {*/

exports.Now = Now;
// end node

  //}
