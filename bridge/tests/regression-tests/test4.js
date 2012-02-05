var description = 'Test4: non-existing service';
var Bridge = require(__dirname+'/../../lib/bridge.js').Bridge;
bridge = new Bridge({host: 'localhost'});
bridge.ready(function(){
    console.log(description);
    /**
       Server should not return a service for non-existing name.
       Note: find a better way to detect if the server has that service or not
     */
    bridge.getService('some non-existing service', function(service) {
        process.exit(1);
    });
    setTimeout(function () {
        process.exit(0);
    }, 2000);
});