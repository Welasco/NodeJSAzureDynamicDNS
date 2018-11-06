var http = require('http');
var nconf = require('nconf');
var AADToken = require('./AADTokenManagement');

function Post(codestring) {
    // Build the post string from an object
    var post_data = querystring.stringify({
        'compilation_level' : 'ADVANCED_OPTIMIZATIONS',
        'output_format': 'json',
        'output_info': 'compiled_code',
          'warning_level' : 'QUIET',
          'js_code' : codestring
    });

    AADToken.GetToken();

    var AccessToken = nconf.get('ServicePrincipal:token:accessToken');

    var AccessToken = nconf.get('CheckPublicIPProvider');

    // An object of options to indicate where to post to
    var post_options = {
        host: 'closure-compiler.appspot.com',
        port: '80',
        path: '/compile',
        method: 'POST',
        headers: {
            'authorization': 'Bearer ' + AccessToken,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(post_data)
        }
    };
  
    // Set up the request
    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Response: ' + chunk);
        });
    });
  
    // post the data
    post_req.write(post_data);
    post_req.end();
  
}

function Get(host,url,callback) {
    // An object of options to indicate where to post to
    var get_options = {
        host: host,
        port: '80',
        path: url,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // Set up the request
    var get_req = http.request(get_options, function(res) {
        res.setEncoding('utf8');
        var ip = '';
        res.on('data', function (d) {
            //console.log('Response: ' + d);
            ip = d;
        });
        res.on('end', function () {
            if (ip) {
                //console.log('IP: ' + ip);
                callback(ip);
            } else {
                throw new Error("unable to get public ip from: " + host);
            }

        });
    });
    get_req.end(); 
}

module.exports.Get = Get;
module.exports.Post = Post;