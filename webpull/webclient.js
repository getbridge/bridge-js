now = new require('now').Now();

now('webpull.fetch_url').call( 'http://flotype.com/images/shipyard.png', function(file) {
    console.log('received file', file.render_ref() );
    now('resize.resize').call( file, 200, 230, function(file) {
            file('get_localpath').call(function(result) {
                console.log('PATH', result);
            });
        }
    );
} );