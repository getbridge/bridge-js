(function() {
  var Dequeue, DequeueNode, joinBuffer;

  joinBuffer = function(buf) {
    var buflen, joined, pos, x, _i, _j, _len, _len2;
    buflen = 0;
    for (_i = 0, _len = buf.length; _i < _len; _i++) {
      x = buf[_i];
      buflen += x.length;
    }
    joined = Buffer(buflen);
    pos = 0;
    for (_j = 0, _len2 = buf.length; _j < _len2; _j++) {
      x = buf[_j];
      x.copy(joined, pos);
      pos += x.length;
    }
    return joined;
  };

  exports.joinBuffer = joinBuffer;

  DequeueNode = (function() {

    function DequeueNode(data) {
      this.data = data;
      this.prev = this.next = null;
    }

    return DequeueNode;

  })();

  Dequeue = (function() {

    function Dequeue() {
      this.head = new DequeueNode;
      this.tail = new DequeueNode;
      this.empty();
    }

    Dequeue.prototype.empty = function() {
      this.head.next = this.tail;
      this.tail.prev = this.head;
      return this.length = 0;
    };

    Dequeue.prototype.isEmpty = function() {
      return this.head.next === this.tail;
    };

    Dequeue.prototype.push = function(data) {
      var node;
      node = new DequeueNode(data);
      node.prev = this.tail.prev;
      node.prev.next = node;
      node.next = this.tail;
      this.tail.prev = node;
      return this.length += 1;
    };

    Dequeue.prototype.pop = function() {
      var node;
      if (this.isEmpty()) {
        throw "pop() called on empty dequeue";
      } else {
        node = this.tail.prev;
        this.tail.prev = node.prev;
        node.prev.next = this.tail;
        this.length -= 1;
        return node.data;
      }
    };

    Dequeue.prototype.unshift = function(data) {
      var node;
      node = new DequeueNode(data);
      node.next = this.head.next;
      node.next.prev = node;
      node.prev = this.head;
      this.head.next = node;
      return this.length += 1;
    };

    Dequeue.prototype.shift = function() {
      var node;
      if (this.isEmpty()) {
        throw "shift() called on empty dequeue";
      } else {
        node = this.head.next;
        this.head.next = node.next;
        node.next.prev = this.head;
        this.length -= 1;
        return node.data;
      }
    };

    return Dequeue;

  })();

  Dequeue.prototype.merge_prefix = function(size) {
    var chunk, joined, prefix, remaining;
    if (this.length < 1) return;
    if ((this.length === 1) && (this.head.next.data.length <= size)) return;
    prefix = [];
    remaining = size;
    while (this.length && (remaining > 0)) {
      chunk = this.shift();
      if (chunk.length > remaining) {
        this.unshift(chunk.slice(remaining));
        chunk = chunk.slice(0, remaining);
      }
      prefix.push(chunk);
      remaining -= chunk.length;
    }
    if (prefix) {
      joined = joinBuffer(prefix);
      this.unshift(joined);
    }
    if (this.length < 1) return this.unshift(Buffer(0));
  };

  exports.Dequeue = Dequeue;

}).call(this);
