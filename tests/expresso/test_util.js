var util = require(__dirname + '/../../lib/util.js');
var Reference = require(__dirname + '/../../lib/reference.js');
var BridgeDummy = require(__dirname + '/bridge_dummy.js');
var assert = require('assert');

exports.testGenerateGuid = function () {
  var ids = {};
  for (var i = 0; i < 10; i++) {
    var id = util.generateGuid();
    assert.equal(id.length, 12);
    assert.isUndefined(ids[id]);
    ids[id] = true;
  }
};

exports.testFindOps = function () {
  var obj = {
    a:1,
    b:2,
    c: function(){},
    d: console.log,
    _e: function(){}
  };
  var ops = util.findOps(obj);
  assert.eql(['c', 'd'], ops);
};

exports.testStringifyAndParse = function () {
  var data = {'a': 1, 'b': "test code", 'c': {}, 'd': [1,false,null,"asdf",{'a': 1, 'b': 2}]}
  assert.eql(util.parse(util.stringify(data)), data);
};

exports.testRefCallback = function () {
  var dummy = new BridgeDummy();
  dest = ['x', 'x', 'x'];
  
  dest_ref = new Reference(dummy, dest.concat(["callback"]))._toDict();
  ref = new Reference(dummy, dest);
  
  cb = util.refCallback(ref);
  
  assert.type(cb, 'function');
  assert.eql(ref._toDict(), cb._toDict());
  
  args = [1,2,3, function(){}];
  cb.apply(undefined, args);
  assert.eql(args, dummy.lastArgs);
  assert.eql(dest_ref, dummy.lastDest);
  
  args = [4,5,6, function(){return 1}];
  cb.callback.apply(undefined, args);
  assert.eql(args, dummy.lastArgs);
  assert.eql(dest_ref, dummy.lastDest);
};