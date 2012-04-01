var st = require('node-static');
var file = new(st.Server)(__dirname+'/public');
require('http').createServer(function (request, response) {
  request.addListener('end', function () {
    file.serve(request, response);
  });
}).listen(9000);
