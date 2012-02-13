var fs = require('fs');
var util = require('util');
var spawn = require('child_process').spawn;

runAllTests('regression-tests');
//spawnTest(__dirname + '/regression-tests/test9.js', 'test9');


function runAllTests(path) {
    fs.readdirSync(__dirname + '/' + path).forEach(function(file) {
        var name = file.substr(0, file.indexOf('.'));
        spawnTest(__dirname + '/' + path + '/' + file, name);
    });
}

function spawnTest(path, name, expectedExitCode) {
    if (!expectedExitCode) {
        expectedExitCode = 0;
    }
    var p = spawn('node', [path]);

    p.stdout.on('data', function (data) {
        console.log(p.pid + '|' + name + ':' + data);
    });

    p.stderr.on('data', function (data) {
        console.log(p.pid + '|' + name + ' ERROR: ' + data);
    });

    p.on('exit', function (code) {
        if (code === expectedExitCode) {
            console.log(p.pid + '|' + name + ': PASSED');
        } else {
            console.log(p.pid + '|' + name + ': FAILED, exited with code ' + code);
            process.exit(1);
        }
    });
}