var http = require('http');
var https = require('https');
var AADToken = require('./AADTokenManagement');
var log = require('./logger');

function Post(host,url,body) {

    log.info('Starting Post request');
    AADToken.GetToken(function (AccessToken){

        // Build the post string from an object
        /*
        var post_data = querystring.stringify({
            'compilation_level' : 'ADVANCED_OPTIMIZATIONS',
            'output_format': 'json',
            'output_info': 'compiled_code',
            'warning_level' : 'QUIET',
            'js_code' : codestring
        });
        */
       
        var post_data = JSON.stringify(body);

        // An object of options to indicate where to post to
        var post_options = {
            host: host,
            port: '443',
            path: url,
            method: 'PUT',
            headers: {
                'authorization': 'Bearer ' + AccessToken,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };
        log.debug('Post_options: ' + JSON.stringify(post_options));
        log.debug('Post_Body: ' + post_data);
        process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
        // Set up the request
        var post_req = https.request(post_options, function(res) {
            let statuscode = res.statusCode;
            let resheaders = res.headers;
            log.debug('HTTP POST Response STATUS: ' + statuscode);
            log.debug('HTTP POST Response HEADERS: ' + JSON.stringify(resheaders));
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                log.debug('HTTP POST Response Body: ' + chunk);
            });
        });
      
        // post the data
        post_req.write(post_data);
        post_req.end();        
    });
}

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
module.exports.Post = Post;