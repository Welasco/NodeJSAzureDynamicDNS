var http = require('https');
var dnsrecord = require('./UpdateDNSRecordSet');
var body = JSON.stringify(dnsrecord);
var options = {
    host: 'VSANTANA-SURFAC',
    path: '/api/jsonpost',
    port: '443',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }
};

callback = function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));  

    var str = ''
    res.on('data', function (chunk) {
        str += chunk;
        console.log('BODY: ' + chunk);
    });

    res.on('end', function () {
        console.log(str);
    });
}
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
var req = http.request(options, callback);
//This is the data we are posting, it needs to be a string or a buffer
req.write(body);
req.end();

