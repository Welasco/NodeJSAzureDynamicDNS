var get = require('./http-request');
get.Get('checkip.amazonaws.com','/',function (ip) {
    console.log("IP: " + ip);
});
var test = new Date();
console.log(test);
