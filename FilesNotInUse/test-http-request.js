var request = require('sync-request');
var log = require('./../logger');

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