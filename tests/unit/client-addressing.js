var vows = require('vows'),
    assert = require('assert'),
    Bridge = require('bridge');

var opts = {apiKey: 'abcdefgh', host: 'localhost', port: 8090, log: 100};

var pingService = new Bridge(opts);
pingService.publishService('ping', { sendPing: function (msg, cb) {
  cb('Received "' + msg + '"');
}});

pingService.connect(function () {
  setTimeout(function () {
    var bridge = new Bridge(opts);
    bridge.connect(function () {
      vows.describe('Individual client addressing').addBatch({
        'when discovering the client as a result of service discovery': {
          topic: function () {
            var cb = this.callback;
            bridge.getService('ping', function (ping) {
	      /*
	       * what is a meaningful result for context? Empty string when
	       * not in any context? or "none"? Expected might be "last
	       * context", which is certainly fine.
	       */
              cb(null, bridge.context());
            });
          },
          'we can get the corresponding client,': {
            topic: function (context) {
              assert.ok(typeof context === 'object' &&
			context.source !== undefined);
              var client = bridge.getClient(context.source);
	      var self = this;
              client.getService('ping', function (svc) {
		self.callback(null, svc);
	      });
            },
            'and call its methods': {
              topic: function (svc) {
		var self = this;
                svc.sendPing('asdf', function (arg) {
		  self.callback(null, arg);
		});
              },
              '(pingggg)': function (res) {
		assert.equal(res, 'Received "asdf"');
              }
            }
          }
        }
      }).run();
    });
  }, 100);
});
