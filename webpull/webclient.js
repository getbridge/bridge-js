now = new require('now').Now();

now('webpull.fetch_url').call( 'http://slashdot.org/', function(filename, file) {
    console.log('received file', filename);
    file('get_body').call( function(body) {
        // console.log('BODY', body);
    });
} );