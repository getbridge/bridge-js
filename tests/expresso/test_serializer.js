var util = require(__dirname + '/../../lib/util.js');
var Serializer = require(__dirname + '/../../lib/serializer.js');
var BridgeDummy = require(__dirname + '/bridge_dummy.js');
var ReferenceDummy = require(__dirname + '/reference_dummy.js');
var assert = require('assert');

exports.testSerialize = function () {
  var dummy = new BridgeDummy();
  
  var test2 = new Test2();
  var test3 = new Test3();
  var test4 = function(){};
  
  var obj = {
    a: {
      b: Test1
    },
    c: 5,
    d: true,
    e: 'abc',
    f: [test2, test3],
    g: test2,
    h: test3,
    i: [test4]
  }
  
  var ser = Serializer.serialize(dummy, obj);
  assert(arrayInclude(dummy.stored, [Test1, ['a']]));
  assert(arrayInclude(dummy.stored, [test2, ['c']]));
  assert(arrayInclude(dummy.stored, [test3, ['d', 'e', 'c']]));
  
  var found = false;
  for (var i in dummy.stored) {
    var val = dummy.stored[i][0];
    if (util.hasProp(val, 'callback')) {
      if (val.callback === test4) {
        found = true;
      }
    }
  }
  assert(found);
};


var Test1 = {
  a: function(){},
  b: {}
}

function Test2 () {
}

Test2.prototype.c = function(){};

function Test3 () {
}

util.inherit(Test3, Test2);

Test3.prototype.d = function(){};
Test3.prototype.e = function(){};


function arrayInclude (arr, find) {
  for (var i in arr) {
    if (isEqual(arr[i], find))
      return true;
  }
  return false;
}

function eq(a, b, stack) {
  // Identical objects are equal. `0 === -0`, but they aren't identical.
  // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
  if (a === b) return a !== 0 || 1 / a == 1 / b;
  // A strict comparison is necessary because `null == undefined`.
  if (a == null || b == null) return a === b;
  // Unwrap any wrapped objects.
  if (a._chain) a = a._wrapped;
  if (b._chain) b = b._wrapped;
  // Invoke a custom `isEqual` method if one is provided.
  if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
  if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
  // Compare `[[Class]]` names.
  var className = toString.call(a);
  if (className != toString.call(b)) return false;
  switch (className) {
    // Strings, numbers, dates, and booleans are compared by value.
    case '[object String]':
      // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
      // equivalent to `new String("5")`.
      return a == String(b);
    case '[object Number]':
      // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
      // other numeric values.
      return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
    case '[object Date]':
    case '[object Boolean]':
      // Coerce dates and booleans to numeric primitive values. Dates are compared by their
      // millisecond representations. Note that invalid dates with millisecond representations
      // of `NaN` are not equivalent.
      return +a == +b;
    // RegExps are compared by their source patterns and flags.
    case '[object RegExp]':
      return a.source == b.source &&
             a.global == b.global &&
             a.multiline == b.multiline &&
             a.ignoreCase == b.ignoreCase;
  }
  if (typeof a != 'object' || typeof b != 'object') return false;
  // Assume equality for cyclic structures. The algorithm for detecting cyclic
  // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
  var length = stack.length;
  while (length--) {
    // Linear search. Performance is inversely proportional to the number of
    // unique nested structures.
    if (stack[length] == a) return true;
  }
  // Add the first object to the stack of traversed objects.
  stack.push(a);
  var size = 0, result = true;
  // Recursively compare objects and arrays.
  if (className == '[object Array]') {
    // Compare array lengths to determine if a deep comparison is necessary.
    size = a.length;
    result = size == b.length;
    if (result) {
      // Deep compare the contents, ignoring non-numeric properties.
      while (size--) {
        // Ensure commutative equality for sparse arrays.
        if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
      }
    }
  } else {
    // Objects with different constructors are not equivalent.
    if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
    // Deep compare objects.
    for (var key in a) {
      if (_.has(a, key)) {
        // Count the expected number of properties.
        size++;
        // Deep compare each member.
        if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
      }
    }
    // Ensure that both objects contain the same number of properties.
    if (result) {
      for (key in b) {
        if (_.has(b, key) && !(size--)) break;
      }
      result = !size;
    }
  }
  // Remove the first object from the stack of traversed objects.
  stack.pop();
  return result;
}

// Perform a deep comparison to check if two objects are equal.
var isEqual = function(a, b) {
  return eq(a, b, []);
};
