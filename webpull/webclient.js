var Now = new require('now').Now;



var now = new Now();

var webpull = now.getService('webpull');
var resize = now.getService('resize');

webpull('fetch_url').call( 'http://flotype.com/images/shipyard.png', function(downloaded_file) {
  resize('resize').call( downloaded_file, 2000, 2300, function(resized_file) {
      resized_file('get_localpath').call(function(result) {
          console.log('PATH', result);
      });
    }
  );
});