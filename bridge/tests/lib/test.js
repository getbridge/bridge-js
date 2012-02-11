exports.pass = function() {
    process.exit(0);
};

exports.fail = function(msg) {
    console.log("\n============================================");
    console.log(" Description: ", msg);
    process.exit(1);
}
