(function() {
  var IOStream, deque;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  
  deque = require('./deque.js');

  IOStream = (function() {

    function IOStream(socket) {
      this.socket = socket;
      this.consume = __bind(this.consume, this);
      this.read_from_buffer = __bind(this.read_from_buffer, this);
      this.read_to_buffer = __bind(this.read_to_buffer, this);
      this.read_from_socket = __bind(this.read_from_socket, this);
      this.read_bytes = __bind(this.read_bytes, this);
      this.read_until = __bind(this.read_until, this);
      this.write = __bind(this.write, this);
      this.max_buffer_size = 104857600;
      this.read_chunk_size = 4096;
      this.read_buffer_size = 0;
      this.read_buffer = new deque.Dequeue;
      this.desired_bytes = void 0;
      this.read_delimiter = void 0;
      this.read_callback = void 0;
      this.socket.on('data', this.read_from_socket);
    }

    IOStream.prototype.write = function(data) {
      return this.socket.write(data);
    };

    IOStream.prototype.read_until = function(delimiter, callback) {
      this.read_delimiter = delimiter;
      this.read_callback = callback;
      return this.read_from_buffer();
    };

    IOStream.prototype.read_bytes = function(num_bytes, callback) {
      this.desired_bytes = num_bytes;
      this.read_callback = callback;
      return this.read_from_buffer();
    };

    IOStream.prototype.read_from_socket = function(data) {
      this.read_to_buffer(data);
      return this.read_from_buffer();
    };

    IOStream.prototype.read_to_buffer = function(chunk) {
      this.read_buffer.push(chunk);
      return this.read_buffer_size += chunk.length;
    };

    IOStream.prototype.read_from_buffer = function() {
      var callback, delimiter_len, first, loc, num_bytes;
      if (this.desired_bytes != null) {
        if (this.read_buffer_size >= this.desired_bytes) {
          num_bytes = this.desired_bytes;
          callback = this.read_callback;
          this.desired_bytes = void 0;
          this.read_callback = void 0;
          return callback(this.consume(num_bytes));
        }
      } else if (this.read_delimiter != null) {
        this.read_buffer.merge_prefix(this.max_buffer_size);
        first = this.read_buffer.head.next;
        if (first.data != null) {
          loc = this.read_buffer.head.next.data.indexOf(this.read_delimiter);
          if (loc !== 1) {
            callback = this.read_callback;
            delimiter_len = this.read_delimiter.length;
            this.read_callback = void 0;
            this.read_delimiter = void 0;
            return callback(this.consume(loc + delimiter_len));
          }
        }
      }
    };

    IOStream.prototype.consume = function(loc) {
      if (loc === 0) return "";
      this.read_buffer.merge_prefix(loc);
      this.read_buffer_size -= loc;
      return this.read_buffer.shift();
    };

    return IOStream;

  })();

  exports.IOStream = IOStream;

}).call(this);
