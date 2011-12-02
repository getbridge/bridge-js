var util = require('util');
var amqp = require('amqp');

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

var NowRef = (function(nowroot, pathchain) {
    function NowRef() {
        /* __call__ */
        var args = [NowRef.pathchain].concat( [].slice.apply(arguments) );
        NowRef.nowroot.execute.apply(NowRef.nowroot, args);
    };
    (function(){
        /* constructor */
        NowRef.nowroot = nowroot;
        NowRef.pathchain = pathchain;
    })();
    return NowRef;
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
        for (var x in this.queue) {
            this.callback.apply(null, this.queue[x]);
        }
    }
    return CallQueue;
})();

var NowSerialize = (function() {
    function NowSerialize(pivot) {
        typ = typeOf(pivot);
        var result;
        switch(typ) {
            case 'object':
                if (pivot._get_now_ref) {
                    result = ['now', pivot._get_now_ref()];
                } else {
                    var tmp = {};
                    for (pos in pivot) {
                        var val = pivot[pos];
                        tmp[pos] = NowSerialize(val);
                    }
                    result = ['list', tmp];
                }
                break;
            case 'array':
                var tmp = [];
                for (pos in pivot) {
                    var val = pivot[pos];
                    tmp.push(NowSerialize(val));
                }
                result = ['list', tmp];
                break;
            case 'string':
                result = ['str', pivot];
                break;
            case 'number':
                result = ['float', pivot];
                break;
            case 'null':
                result = ['none', null];
                break;
            default:
                console.log('Unknown', pivot, typ);
        }
        return result;
    };
    return NowSerialize;
})();

var NowConnection = (function() {
    function NowConnection(ready_callback) {
        this.ready_callback = ready_callback;
        this.client = amqp.createConnection({ host: 'localhost' });
        this.connection_ready = this.connection_ready.bind(this);
        this.client_ready = this.client_ready.bind(this);
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
        console.log('received blah', message, headers);
    }
    NowConnection.prototype.client_ready = function() {
        this.ready_callback();
    }
    NowConnection.prototype.send = function(routingKey, message) {
        console.log('sending', this.myexc.name, routingKey, message)
        this.myexc.publish(routingKey, message);
    }
    NowConnection.prototype.connection_ready = function() {
        console.log('on the way');
        this.public_name = guidgenerator();
        var q = this.client.queue( this.get_queue_name(), {}, (function(myq) {
            console.log('queue created', this.get_queue_name());
            q.subscribe(this.datagram_received);

            this.myq = q;

            console.log('trying to start exchange', this.get_exchange_name());
            this.client.exchange(this.get_exchange_name(), {autoDelete: false, type:'topic'},  (function (myexc) {
                this.client.exchange(this.DEFAULT_EXCHANGE, {autoDelete: false, type:'direct'},  (function (defexc) {
                  this.myexc = myexc;
                  this.defexc = defexc;

                  console.log('defined', myq.name, myexc.name, defexc.name);
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

        // NowObject.public_name = guidgenerator();

var NowObject = (function(config) {
    function NowObject(pathstr) {
        /* __call__ */
        var pathchain = pathstr.split('.');
        return new NowRef(NowObject, pathchain);
    };
    NowObject.connection_ready = function () {
        console.log('connected');
        NowObject.cq.on_ready();
    };
    NowObject.execute_from_queue = function() {
        var args = [].slice.apply(arguments);
        if (args[0] == 'send') {
            pathchain = args[1];
            command_args = args[2];
            var serargskwargs = [NowSerialize(command_args), ['dict', {}] ];
            packet = {'serargskwargs': serargskwargs, 'pathchain': pathchain};
            console.log('serialized', packet);
            NowObject.connection.send( 'N.' + pathchain[0], JSON.stringify(packet) )
        } else {
            console.log('UNKNOWN QUEUED COMMAND');
        }
    };
    NowObject.execute = function() {
        var args = [].slice.apply(arguments);
        pathchain = args[0];
        command_args =  args.slice(1);
        NowObject.cq.queue_or_execute('send', pathchain, command_args);
    };
    (function(){
        /* constructor */
        NowObject.cq = new CallQueue(NowObject.execute_from_queue);
        NowObject.connection = new NowConnection(NowObject.connection_ready);
    })();
    return NowObject;
});

var now = new NowObject(4);

now('webpull.fetch_url')( 'http://slashdot.org/', null )
