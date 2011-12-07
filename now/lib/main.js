var util = require('util');
var amqp = require('amqp');

var __hasProp = Object.prototype.hasOwnProperty;
__extends = function(child, parent) { 
    for (var key in parent) { 
        if (__hasProp.call(parent, key)) child[key] = parent[key];
    }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype; 
    child.prototype = new ctor; 
    child.__super__ = parent.prototype; 
    return child;
};

guidgenerator = function() {
    var S4;
    S4 = function() {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return "" + S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4();
};

function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
        if (value) {
            if (typeof value.length === 'number' &&
                    !(value.propertyIsEnumerable('length')) &&
                    typeof value.splice === 'function') {
                s = 'array';
            }
        } else {
            s = 'null';
        }
    }
    return s;
}

var getKeys = function(obj){
   var keys = [];
   for(var key in obj){
      keys.push(key);
   }
   return keys;
}

var NowPath = (function(_nowroot, _pathchain, _named) {
    function NowPath() {
        /* __call__ */
        var args = [].slice.apply(arguments);
        NowPath.nowroot.nowpath_called(NowPath.pathchain, NowPath.named, args);
    };
    NowPath.get_local_name = function() {
        return NowPath.pathchain[1];
    };
    NowPath.render_ref = function() {
        if (NowPath.pathchain[0] == 'local') {
            NowPath.pathchain[0] = NowPath.nowroot.get_public_name();
        }
        return {'ref': NowPath.pathchain};
    };
    (function(){
        /* constructor */
        NowPath.nowroot = _nowroot;
        NowPath.pathchain = _pathchain;
        NowPath.named = _named;
    })();
    return NowPath;
});

var CallQueue = (function() {
    function CallQueue(callback){
        this.ready = false;
        this.queue = [];
        this.callback = callback;
    };
    CallQueue.prototype.on_ready = function() {
        this.ready = true;
        this.process_queue();
    }
    CallQueue.prototype.queue_or_execute = function() {
        this.queue.push( [].slice.apply(arguments) );
        if (this.ready) {
            this.process_queue();
        }
    }
    CallQueue.prototype.process_queue = function() {
        var qcopy = this.queue;
        this.queue = [];
        for (var x in qcopy) {
            this.callback.apply(null, qcopy[x]);
        }
    }
    return CallQueue;
})();

var NowSerialize = (function() {
    NowSerialize = {}
    NowSerialize.serialize = function(nowroot, pivot, add_links_dict) {
        var typ = typeOf(pivot);
        var result;
        switch(typ) {
            case 'object':
                if (pivot._now_ref) {
                    var target = pivot._now_ref.render_ref();
                    add_links_dict[ target['ref'][0] ] = true;
                    result = ['now', target ];
                } else {
                    var tmp = {};
                    for (pos in pivot) {
                        var val = pivot[pos];
                        tmp[pos] = NowSerialize.serialize(nowroot, val, add_links_dict);
                    }
                    result = ['list', tmp];
                }
                break;
            case 'array':
                var tmp = [];
                for (pos in pivot) {
                    var val = pivot[pos];
                    tmp.push(NowSerialize.serialize(nowroot, val, add_links_dict));
                }
                result = ['list', tmp];
                break;
            case 'string':
                result = ['str', pivot];
                break;
            case 'number':
                result = ['float', pivot];
                break;
            case 'function':
                var wrap = function(){};
                wrap.handle_remote_call = pivot;
                var ref = nowroot.register_service(wrap);
                var target = ref.render_ref();
                add_links_dict[ target['ref'][0] ] = true;
                result = ['now', target ];
                break;
            case 'null':
                result = ['none', null];
                break;
            default:
                console.log('Unknown', pivot, typ);
        }
        return result;
    };
    NowSerialize.unserialize = function(nowroot, tup) {
        var typ = tup[0];
        var pivot = tup[1];
        var result;
        switch(typ) {
            case "list":
                var tmp = [];
                for (pos in pivot) {
                    tmp.push( NowSerialize.unserialize(nowroot, pivot[pos] ) );
                }
                result = tmp;
                break;
            case "dict":
                var tmp = {};
                for (pos in pivot) {
                    tmp[pos] = NowSerialize.unserialize(nowroot, pivot[pos] );
                }
                result = tmp;
                break;
            case "str":
                result = pivot;
                break;
            case "float":
                result = pivot;
                break;
            case "now":
                result = new NowPath(nowroot, pivot['ref']);
                break;
            case "none":
                break;
            default:
                console.log('Unknown', pivot, typ)
        }
        return result;
    }
    return NowSerialize;
})();

var NowConnection = (function() {
    function NowConnection(ready_callback, message_received) {
        this.ready_callback = ready_callback;
        this.message_received = message_received;
        this.client = amqp.createConnection({ host: 'localhost' });

        this.connection_ready = this.connection_ready.bind(this);
        this.client_ready = this.client_ready.bind(this);
        this.datagram_received = this.datagram_received.bind(this);

        this.client.on('ready', this.connection_ready);
        this.DEFAULT_EXCHANGE = 'D_DEFAULT';
    }
    NowConnection.prototype.get_queue_name = function() {
        return 'C_' + this.public_name;
    }
    NowConnection.prototype.get_exchange_name = function() {
        return 'T_' + this.public_name;
    }
    NowConnection.prototype.datagram_received = function(message, headers, deliveryInfo) {
        var message = JSON.parse(message.data);
        for (key in headers) {
            var tmax = 0;
            var cnt = 0;
            var already = false;
            if (key.substring(0,5) == 'link_') {
                tmax += 1;
                var q = this.client.queue('C_' + headers[key], {});
                q.on('queueBindOk', (function() {
                    if ( (cnt == tmax) && (!already) ) {
                        already = true;
                        this.message_received(message);
                    } else {
                        cnt += 1;
                    }
                }).bind(this));
                q.bind(this.get_exchange_name(), headers[key]);
            }
        }
        if ( (cnt == tmax) && (!already) ) {
            already = true;
            this.message_received(message);
        } else {
            cnt += 1;
        }
    }
    NowConnection.prototype.client_ready = function() {
        this.ready_callback();
    }
    NowConnection.prototype.send = function(routingKey, message, add_links) {
        console.log('sending', this.myexc.name, routingKey, message, add_links);
        var headers = {};
        for (x in add_links) {
            headers['link_' + x] = add_links[x];
        }
        this.myexc.publish(routingKey, message, {
            headers: headers
        });
    }
    NowConnection.prototype.join_workerpool = function(name) {
        console.log('joining workerpool', name);
        var pool_queue_name = 'W_' + name;
        this.client.queue( pool_queue_name, {}, (function(poolq) {
            // poolq.subscribe(this.datagram_received);
            // poolq.bind(this.DEFAULT_EXCHANGE, 'N.' + name);
        }).bind(this) );
    }
    NowConnection.prototype.connection_ready = function() {
        this.public_name = guidgenerator();
        var q = this.client.queue( this.get_queue_name(), {}, (function(myq) {
            // console.log('queue created', this.get_queue_name());
            q.subscribe(this.datagram_received);

            this.myq = q;

            // console.log('trying to start exchange', this.get_exchange_name());
            this.client.exchange(this.get_exchange_name(), {autoDelete: false, type:'topic'},  (function (myexc) {
                this.client.exchange(this.DEFAULT_EXCHANGE, {autoDelete: false, type:'direct'},  (function (defexc) {
                  this.myexc = myexc;
                  this.defexc = defexc;

                  // console.log('defined', myq.name, myexc.name, defexc.name);
                  defexc.on('exchangeBindOk', (function(){
                    this.client_ready();
                  }).bind(this));
                  defexc.bind(myexc, "N.*");
                }).bind(this));
            }).bind(this));
        }).bind(this));
    }
    return NowConnection;
})();

var Now = (function() {
    function Now(pathstr) {
        /* __call__ */
        var pathchain = pathstr.split('.');
        return new NowPath(Now, pathchain, true);
    };
    Now.connection_ready = function () {
        console.log('connected');
        Now.cq.on_ready();
    };
    Now.message_received = function(message) {
        console.log('message received', message);
        var pathchain = message.pathchain;
        var serargskwargs = message.serargskwargs;
        var command_args = NowSerialize.unserialize( Now, serargskwargs[0] );
        var command_kwargs = NowSerialize.unserialize( Now, serargskwargs[1] );

        var nowref = new NowPath(Now, pathchain);
        nowref.apply(null, command_args);
    }
    Now.get_public_name = function() {
        return Now.connection.public_name;
    };
    Now.execute_local = function(args) {
        var pathchain = args[0];
        // if (pathchain[0])
        var command_args = args[1];
        var targetobj = Now.children[pathchain[0]];

        if (pathchain.length > 1) {
        } else {
            pathchain.push('remote_call');
        }
        var targetfun = targetobj[ 'handle_' + pathchain[1] ];
        if (targetfun) {
            targetfun.apply( targetobj, command_args );
        } else {
            console.log('No Handler', pathchain);
        }
    };
    Now.execute_system = function(args) {
        console.log('Execute system', args);
    };
    Now.register_service = function(service, name) {
        // console.log('registering service', service, name);
        if (!service._now_ref) {
            if (!name) {
                name = guidgenerator();
            } else {
                Now.connection.join_workerpool(name);
            }
            service._now_ref = new NowPath(Now, [ 'local', name ])
        } else {
            if (name) {
                throw("Service can't be renamed!")
            } else {
                name = service._now_ref.get_local_name()
            }
        }
        Now.children[name] = service;
        return service._now_ref;
    };
    Now.execute = function(args) {
        var pathchain = args[0];
        var named = args[1];
        var command_args = args[2];

        if (pathchain[0] == 'system') {
            Now.execute_system(args);
        }
        if ( (pathchain[0] == Now.get_public_name()) || (pathchain[0] == 'local') ) {
            // console.log('HANDING TO LOCAL', pathchain, pathchain.slice(1));
            Now.execute_local( [pathchain.slice(1), command_args] );
        } else {
            var add_links_dict = {};
            var serargskwargs = [NowSerialize.serialize(Now, command_args, add_links_dict), ['dict', {}] ];
            var packet = {'serargskwargs': serargskwargs, 'pathchain': pathchain};
            // console.log('serialized', packet, 'add_links', add_links_dict);
            if (named) {
                var routing_key = 'N.' + pathchain[0];
            } else {
                var routing_key = pathchain[0];
            }
            Now.connection.send( routing_key, JSON.stringify(packet), getKeys( add_links_dict ) )
        }
    };
    Now.command_queue_callback = function() {
        var args = [].slice.apply(arguments);
        if (args[0] == 'execute') {
            Now.execute( args.slice(1) );
        } else {
            console.log('UNKNOWN QUEUED COMMAND');
        }
    };
    Now.nowpath_called = function(pathchain, named, command_args) {
        Now.cq.queue_or_execute('execute', pathchain, named, command_args);
    };
    (function(){
        /* constructor */
        Now.cq = new CallQueue(Now.command_queue_callback);
        Now.connection = new NowConnection(Now.connection_ready, Now.message_received);
        Now.children = {};
    })();
    return Now;
});

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
ref = now.register_service(hello, 'hello');

// now('local.hello.greet')();

now('webpull.fetch_url')( 'http://slashdot.org/', function(msg, callback) {
    console.log('MOEP', msg);
    callback('frob');
});

// now('webpull.fetch_url')( 'http://slashdot.org/', hello);

// hello.foo()


// now('webpull.fetch_url')( 'http://slashdot.org/', function(body) {
//     console.log('received body', body);
// } );
