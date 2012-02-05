var description = 'Test5: basic remote function calling (WORK IN PROGRESS)';
var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
bridge = new Bridge({host: 'localhost'});
        var b1 = new Bridge({host: 'localhost'});
        var b2 = new Bridge({host: 'localhost'});

bridge.ready(function(){
    var count = 0;

    var ConsoleLogServer = {
        log: function(msg) {
            count++;
            if (count === 5) {
                process.exit(0);
            }
        }
    }
    bridge.publishService('test5_consolelog', ConsoleLogServer, function() {
        process.exit(0);
        //var b3 = new Bridge({host: 'localhost'});
        /*
          console.log(description);
          setTimeout(function() {
          process.exit(1);
          }, 2000);
          serverReady();
        */
    });
});

function serverReady() {
    var b1 = new Bridge({host: 'localhost'});
    var b2 = new Bridge({host: 'localhost'});
    var b3 = new Bridge({host: 'localhost'});
    b1.getService('test5_consolelog', function(service) {
        service.log('b1 1');
        service.log('b1 2');
    });
    b2.getService('test5_consolelog', function(service) {
        service.log('b2 1');
    });
    b2.getService('test5_consolelog', function(service) {
        service.log('b2 2');
    });
    b3.getService('test5_consolelog', function(service) {
        service.log('b3');
    });
}
