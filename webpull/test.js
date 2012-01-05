var Now = new require('now').Now;



var now = new Now();

var webpull = now.getService('webpull');


now.joinChannel('test', {
  handle_chat: function(lol){
    console.log(lol);
  }
});

setInterval(function(){
  now.getChannel('test')('chat').call('x');
}, 1000);