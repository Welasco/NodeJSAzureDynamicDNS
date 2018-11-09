var http = require('http');
var log = require('./../logger');

function Get(host,url,callback) {
    // An object of options to indicate where to post to
    log.info('Starting GET request');
    var get_options = {
        host: host,
        port: '80',
        path: url,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    log.debug('GET_options: ' + JSON.stringify(get_options));
    // Set up the request
    var get_req = http.request(get_options, function(res) {
        res.setEncoding('utf8');
        var ip = '';
        let statuscode = res.statusCode;
        let resheaders = res.headers;
        log.debug('HTTP GET Response STATUS: ' + statuscode);
        log.debug('HTTP GET Response HEADERS: ' + JSON.stringify(resheaders));        
        res.on('data', function (d) {
            //console.log('Response: ' + d);
            ip = d;
        });
        res.on('end', function () {
            if (ip) {
                //console.log('IP: ' + ip);
                log.debug('HTTP GET Response Body: ' + ip);
                callback(ip);
            } else {
                log.error("unable to get public ip from: " + host);
                throw new Error("unable to get public ip from: " + host);
            }

        });
    });
    get_req.end(); 
}

module.exports.Get = Get;