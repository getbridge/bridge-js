var Bridge = require(__dirname + '/../bridge').Bridge;
var request = require('request');
var fs = require('fs');
var img = require('imagemagick');
var qs = require('querystring');
var http = require('http');

bridge = new Bridge({ host: 'localhost' });

bridge.ready(function() {
  bridge.publishService('image-resizer', {
    
    resize: function(url, height, width) {
      var filenameRegex = new RegExp(/.+\/(.*)/);
      var matches = url.match(filenameRegex);
      var fileName = matches[1];
      input = request(url);
      input.pipe(fs.createWriteStream(fileName));
      
      input.on("end", function() {
        
        img.resize({ srcPath: fileName, dstPath: "resized-" + fileName, width: width, height: height }, function (error, stdout, stderr) {
          if (error) { throw err; }
          
          fs.readFile("resized-" + fileName, function (error, data) {
            var base64Image = new Buffer(data, 'binary').toString('base64');
            
            var postData = qs.stringify({
              'key' : '6859a54acf5499d1aab09b56ccce29d9',
              'image': base64Image
            });
            
            var postOptions = {
              host: 'api.imgur.com',
              port: '80',
              path: '/2/upload.json',
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
              }
            };
            
            var postRequest = http.request(postOptions, function (res) {
              res.setEncoding('utf8');
              var response = ""; // This will be the response to the POST request
              
              res.on('data', function (chunk) {
                response += chunk;
              });
              
              res.on('end', function() {
                var responseObject = JSON.parse(response); // imgur answers with JSON
                var result = responseObject.upload.links;
                console.log(result); // This will contain the imgur links (image, imgur page, delete, small square, large thumbnail)
              });
            });
            
            postRequest.write(postData);
            postRequest.end();
            
          });
        });
        
      });
    }
  });
  
  setTimeout(function() {
    bridge.getService('image-resizer', function (service) {
      service.resize("http://code.google.com/apis/accounts/images/ClientLoginDiagram.png", 100, 100)
    });
  }, 500);
});