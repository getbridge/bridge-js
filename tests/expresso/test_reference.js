var util = require(__dirname + '/../../lib/util.js');
var Reference = require(__dirname + '/../../lib/reference.js');
var BridgeDummy = require(__dirname + '/bridge_dummy.js');
var assert = require('assert');

exports.testReference = function () {
  var dummy = new BridgeDummy();
  var ref = new Reference(dummy, ['x', 'y', 'z'], ['a','b','c']);
  
  assert('a' in ref);
  assert('b' in ref);
  assert('c' in ref);
  
  assert.eql({ref: ['x', 'y', 'z'], operations: ['a', 'b', 'c']}, ref._toDict());
  
  var args = [1, 2, function(){}];
  ref.a.apply(undefined, args);
  
  assert.eql(args, dummy.lastArgs);
  assert.eql(['x', 'y', 'z', 'a'], dummy.lastDest['ref']);
  assert.isUndefined(dummy.lastDest.operations)
  
};

