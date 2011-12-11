var now = new require('now').Now();

ChannelHandler = (function() {
    function ChannelHandler(channel_name) {
        this.channel_name = channel_name;
    }

    ChannelHandler.prototype.joined = function(channel_ref) {
        this.channel_ref = channel_ref;
        this.channel_ref.call('foo');
    }

    ChannelHandler.prototype.handle_remote_call = function(foo) {
        console.log('LA', foo);
    }

    return ChannelHandler;
})();

var lobby = new ChannelHandler('lobby');
now.joinChannel('lobby', lobby);