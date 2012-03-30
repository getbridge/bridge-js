var vows = require('vows'),
    assert = require('assert');

// Internal modules
var serializer = require('../../lib/serializer.js'),
    util = require('../../lib/util.js')
    Ref = require('../../lib/ref.js');

// Mock objects
var randomizedService = {ref:['client', 'CLIENTID', 'RANDOM'], operations:['callback']}
var bridge = {
  'send':function(){}
  ,'createCallback': function(){
    name = 'RANDOM';
    ref = this.getPathObj( ['client', this.getClientId(), name] );
    return ref;
  }
  ,'getClientId': function(){
    return 'CLIENTID';
  }
  ,'getPathObj': function(pathchain){
    return Ref(this, pathchain);
  }
}

// Testing combinators
function identity(x){
  assert.equal(serializer.serialize(null, x), x);
}

function deepIdentity(x){
  assert.deepEqual(serializer.serialize(null, x), x);
}

vows.describe('Testing serializer module').addBatch({
    'Serializing': {
      'a float': {
        topic:0.3
        ,'should be unchanged':identity
      }
      ,'a string': {
        topic:"FOOBAR"
        ,'should be unchanged': identity
      }
      ,'an array': {
        'with references': {
          topic: function(){ return ["a", Ref(bridge, ['a', 'b', 'c'])] }
          ,'should replace references': function(topic) {
            assert.deepEqual(serializer.serialize(bridge, topic)[1], {ref:['a', 'b', 'c'], operations:[]});
          }
          ,'should not affect primitives': function(topic) {
            var result = serializer.serialize(bridge, topic);
            assert.equal(result[0], topic[0]);
          }
        }
        ,'with functions': {
          topic: function(){ return ["a", function(){}] }
          ,'should replace references': function(topic) {
            assert.deepEqual(serializer.serialize(bridge, topic)[1], randomizedService);
          }
          ,'should not affect primitives': function(topic) {
            var result = serializer.serialize(bridge, topic);
            assert.equal(result[0], topic[0]);
          }
        }
        ,'with primitives': {
          topic:[1, true, "baz"]
          ,'should be unchanged': deepIdentity
        }
      }
      ,'a dictionary': {
        'with references': {
          topic: function(){ return {"a": 1, b:Ref(bridge, ['a', 'b', 'c'])} }
          ,'should replace references': function(topic) {
            assert.deepEqual(serializer.serialize(bridge, topic).b, {ref:['a', 'b', 'c'], operations:[]});
          }
          ,'should not affect primitives': function(topic) {
            var result = serializer.serialize(bridge, topic);
            assert.equal(result.a, topic.a);
          }
        }
        ,'with functions': {
          topic: function(){ return {"a": 1, b:function bFunc(){}} }
          ,'should replace functions': function(topic) {
            assert.deepEqual(serializer.serialize(bridge, topic).b, randomizedService);
          }
          ,'should not affect primitives': function(topic) {
            var result = serializer.serialize(bridge, topic);
            assert.equal(result.a, topic.a);
          }
        }
        ,'with primitives': {
          topic:{a:1, b:true, c:"baz"}
          ,'should be unchanged': deepIdentity
        }
      }
      ,'a reference': {
        topic: function(){
          // Vows is an idiot. A topic cannot itself be a function
          return Ref(bridge, ['a', 'b','c']);
        }
        ,'should be a dictionary': function(topic){
          var result = serializer.serialize(bridge, topic);
          assert.deepEqual(result, {ref:['a', 'b', 'c'], operations:[]});
        }
      }
      ,'a null': {
        topic:null
        ,'should be null': assert.isNull
      }
      ,'a function': {
        topic:function(){
          return function anonymous(){}
        }
        ,'should be wrapped in a service': function(topic){
          var result = serializer.serialize(bridge, topic);
          assert.deepEqual(result, randomizedService);
        }
      }
    },
    'test deserializing': {
      'a float': {
      }
      ,'a string': {

      }
      ,'an array': {
        'with primitives': {

        }
        ,'with deflated references': {

        }
      }
      ,'a dictionary': {
        'with primitives': {

        }
        ,'wtih defalated references': {

        }
      }
      ,'a null': {

      }
      ,'a deflated reference': {

      }
    }
}).run(); // Run it
