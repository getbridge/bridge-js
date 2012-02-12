var messages = [];
module.exports = function(failureMessage, logLevel) {
    return {
        pass: function() {
            process.exit(0);
        },
        fail: function() {
            console.log("\n============================================");
            console.log(" Description: ", failureMessage);
            if (logLevel) {
                console.log(" Message stack: ");
                for (var i = 0; i < messages.length; i++) {
                    console.log(messages[i]);
                }
            }
            process.exit(1);
        },
        log: function(msg) {
            switch (logLevel) {
            case 0:
                break;
            case 1:
                messages.push(msg);
                break;
            case 2:
                messages.push(msg);
                console.log(msg);
                break;
            default:
                console.log('Invalid logging level');
                break;
            }
        }    
    };
}

