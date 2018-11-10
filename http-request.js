var request = require('sync-request');
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

function Get(host,callback) {
    var res = request('GET', host,{
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'curl/7.9.8 (i686-pc-linux-gnu) libcurl 7.9.8 (OpenSSL 0.9.6b) (ipv6 enabled)'      
        },
      });
    //console.log(res.body.toString('utf-8'));
    if (callback) {
        callback(res.body.toString('utf-8'));    
    }
    else{
        return res.body.toString('utf-8');
    }
}

module.exports.Get = Get;
module.exports.Post = Post;