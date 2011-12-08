now = new require('now').Now();

now('webpull.fetch_url').call( 'http://flotype.com/images/shipyard.png', function(downloaded_file) {
    now('resize.resize').call( downloaded_file, 2000, 2300, function(resized_file) {
            resized_file('get_localpath').call(function(result) {
                console.log('PATH', result);
            });
        }
    );
} );