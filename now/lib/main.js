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
                var tmp = {};
                for (pos in pivot) {
                    var val = pivot[pos];
                    tmp[pos] = NowSerialize(val);
                }
                result = ['list', tmp];
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

var NowObject = (function(config) {
    function NowObject(pathstr) {
        /* __call__ */
        var pathchain = pathstr.split('.');
        return new NowRef(NowObject, pathchain);
    };
    NowObject.connection_ready = (function () {
        console.log('connected');
        NowObject.cq.on_ready();
    });
    NowObject.execute_from_queue = function() {
        var args = [].slice.apply(arguments);
        if (args[0] == 'send') {
            pathchain = args[1];
            command_args = args[2];
            var serialized = NowSerialize(command_args);
            console.log('serialized', serialized);
        } else {
            console.log('UNKNOWN QUEUED COMMAND');
        }
    };
    (function(){
        /* constructor */

        NowObject.connection = amqp.createConnection({ host: 'localhost' });
        NowObject.connection.on('ready', NowObject.connection_ready);

        NowObject.cq = new CallQueue(NowObject.execute_from_queue);

        NowObject.public_name = guidgenerator();
        NowObject.execute = function() {
            var args = [].slice.apply(arguments);
            pathchain = args[0];
            command_args =  args.slice(1);
            if (pathchain[0] == NowObject.public_name) {
                console.log('LOCAL', NowObject.public_name, pathchain, command_args)
            } else {
                console.log('REMOTE', args);
                NowObject.cq.queue_or_execute('send', pathchain, command_args);
            }
        }
    })();
    return NowObject;
});

var now = new NowObject(4);

now('webpull.fetch_url')( {url: 'http://slashdot.org/'}, 'hase', 5, null )
