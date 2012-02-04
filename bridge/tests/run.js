var util  = require('util');
var spawn = require('child_process').spawn;

spawnTest('./tests/regression-tests/test1.js', 'test1_consolelog');

function spawnTest(path, name) {
    var p = spawn('node', [path]);

    p.stdout.on('data', function (data) {
        console.log(name + '|' + p.pid + ':' + data);
    });

    p.stderr.on('data', function (data) {
        console.log(name + '|' + p.pid + ' ERROR: ' + data);
    });

    p.on('exit', function (code) {
        if (code == 0) {
            console.log(name + '|' + p.pid + ' PASSED');
        } else {
            console.log(name + '|' + p.pid + ' FAILED, exited with code ' + code);
        }
    });
}