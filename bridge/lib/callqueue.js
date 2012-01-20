function CallQueue(Target){
  this._target = Target;
  this.ready = false;
  this.queue = [];
};
CallQueue.prototype.push = function(callback, args) {
  if (this.ready) {
    callback.apply(this._target, args);
  } else {
    this.queue.push( {callback: callback, args: args} );
  }
}

CallQueue.prototype.process = function() {
  this.ready = true;
  for (var i = 0, ii = this.queue.length; i < ii; i++) {
    this.queue[i].callback.apply(this._target, this.queue[i].args);
  }
  this.queue = [];
}

// if node
module.exports = CallQueue;
// end node
