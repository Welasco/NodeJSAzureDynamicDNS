// https://weblogs.asp.net/dixin/use-fiddler-with-node-js
// https://github.com/Dixin/CodeSnippets/blob/master/Blog/Dixin.Nodejs/fiddler.js
/*
    In order make it work you have to change the request like this:
    var http = require('http');
    var dnsrecord = require('./UpdateDNSRecordSet');
    var fiddler = require("./fiddler");

    var body = JSON.stringify(dnsrecord);
    var options = {
        // ###### The host must have the full URL you would like to do the request
        host: 'https://VSANTANA-SURFAC/api/jsonpost',
        // ###### Per my understanding when using this fiddler module the path is not used
        path: '/api/jsonpost',
        port: 443,
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
    // ####### You have to call the request using the fiddler module like this:
    // fiddler.setProxy(options)
    // passing your current options as a parameter
    var req = http.request(fiddler.setProxy(options), callback);
    //This is the data we are posting, it needs to be a string or a buffer
    req.write(body);
    req.end();    
*/
const url = require("url"),
    http = require("http"),

    env = process.env,

    proxy = {
        protocol: "http:",
        hostname: "127.0.0.1",
        port: 8888,
    },

    proxyRequests = () => {
        env.http_proxy = env.https_proxy = url.format(proxy);
        env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    },

    unproxyRequests = () => {
        env.http_proxy = env.https_proxy = "";
        env.NODE_TLS_REJECT_UNAUTHORIZED = "";
    },

    setProxy = options => {
        if (typeof options === "string") { // options can be URL string.
            options = url.parse(options);
        }
        if (!options.host && !options.hostname) {
            throw new Error("host or hostname must have value.");
        }
        options.path = url.format(options);
        options.headers = options.headers || {};
        options.headers.Host = options.host || url.format({
            hostname: options.hostname,
            port: options.port
        });
        options.protocol = proxy.protocol;
        options.hostname = proxy.hostname;
        options.port = proxy.port;
        options.href = null;
        options.host = null;
        return options;
    },

    request = (options, callback) => http.request(setProxy(options), callback),
    
    get = (options, callback) => http.get(setProxy(options), callback);

module.exports = {
    proxy,
    proxyRequests,
    unproxyRequests,
    setProxy,
    request,
    get
};