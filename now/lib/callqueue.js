function CallQueue(callback){
  this.ready = false;
  this.queue = [];
  this.callback = callback;
};
CallQueue.prototype.onReady = function() {
  this.ready = true;
  this.process();
}
CallQueue.prototype.push = function() {
  this.queue.push( [].slice.apply(arguments) );
  if (this.ready) {
    this.process();
  }
}
CallQueue.prototype.process = function() {
  var oldQueue = this.queue;
  this.queue = [];
  for (var x in oldQueue) {
    this.callback.apply(null, oldQueue[x]);
  }
}

module.exports = CallQueue;