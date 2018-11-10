
// https://github.com/ForbesLindesay/sync-request
// https://github.com/dhruvbird/http-sync
// https://github.com/then/then-request

var request = require('sync-request');
var res = request('GET', 'http://checkip.amazonaws.com');
console.log(res.body.toString('utf-8'));
var res = request('GET', 'http://ifconfig.co',{
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'curl/7.9.8 (i686-pc-linux-gnu) libcurl 7.9.8 (OpenSSL 0.9.6b) (ipv6 enabled)'      
    },
  });
console.log(res.body.toString('utf-8'));