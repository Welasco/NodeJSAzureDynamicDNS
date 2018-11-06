var http = require('http');
var dnsrecord = require('./UpdateDNSRecordSet');
var body = JSON.stringify(dnsrecord);

var options = {
    host: 'VSANTANA-SURFAC',
    path: '/api/jsonpost',
    port: '3000',
    method: 'PUT'
};

var req = http.request(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
    });
});

req.on('error', function(e) {
console.log('problem with request: ' + e.message);
});

// write data to request body
req.write('data\n');
req.write('data\n');
req.end();