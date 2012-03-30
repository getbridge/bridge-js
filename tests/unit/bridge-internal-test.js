har vows = require('vows'),
    assert = require('assert');


// Convenience methods

function execute(serviceName, methodName, args) {
  return function(bridge){
    var pathchain = ["named", serviceName, serviceName, methodName];
    bridge.execute({'destination':pathchain, 'args':args});
  }
}

// Create a Test Suite
vows.describe('Testing Bridge internals').addBatch({
    'when receiving a message': {
        topic: (new Bridge())

        ,'an RPC call': {
          'for a named service': {
            topic: execute("foo", "bar", [1, 2, 3])
            ,'the method is called correctly': function(bridge) {

            }

          }
          ,'for a callback': {
            topic: execute("RANDOM", "callback", [1, 2, 3])
            ,'the method is called correctly': function(bridge) {

            }
          }
          ,'for the system service': {
            'on a valid hook channel call': {
              topic: execute("system", "hook_channel_handler", [1, 2, 3])
              ,'the handler is assigned a new name': function(topic) {

              }
            }
            ,'on an invalid hook channel call': {
              topic: execute("system", "hook_channel_handler", [1, 2, 3])
              ,'Bridge does not crash': function(bridge) {

              }
            }
            ,'on a valid getservice call': {
              topic: execute("system", "hook_channel_handler", [1, 2, 3])

            }
            ,'on an invalid getservice call': {
              topic: execute("system", "hook_channel_handler", [1, 2, 3])
              ,'Bridge does not crash': function(bridge) {

              }
            }
          }
          ,'for a nonexistent service': {
              topic: execute("nxService", "someMethod", [1, 2, 3])
              'Bridge should not have crashed': function(bridge) {

              }
          }
        }
    },
    'when performing action': {
        'publishing a service': {
            'the handler is added to children table': function (topic) {
            }
         }
         ,'joining a channel' : {
            'the handler is added to the children table': function(topic) {

            }
         }
    }
}).run(); // Run it
