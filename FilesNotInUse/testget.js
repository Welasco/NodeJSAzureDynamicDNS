var nconf = require('nconf');
var httprequest = require('./test-http-request');
var log = require('./../logger');
var isIP = require('is-ip');

nconf.file({ file: './test-config.json' });
debugger;
var PublicIPProviders = nconf.get('CheckPublicIPProviders');
var oldPublicIP = nconf.get('PublicIPAddress');

for (let index = 0; index < PublicIPProviders.length; index++) {
    const PublicIPProvider = PublicIPProviders[index];
    log.info('Cheking PublicIPProvider: ' + PublicIPProvider);
    try {
        var returnip = httprequest.Get(PublicIPProvider);
        let newip = returnip.trim();
        if (isIP(newip)) {
            log.debug('OldIP: ' + oldPublicIP);
            log.debug('newIP: ' + newip);    
            if (oldPublicIP != newip) {
                log.info('Public IP changed: ' + newip);
                //nconf.set('PublicIPAddress', newip);
                //nconf.save();
            } else {
                log.info('Public IP not changed since last check: ' + oldPublicIP);
            }
            break;                        
        }
        else{
            log.error("PublicIP provider returned an invalid IP Address: " + newip);
        }
    } catch (error) {
        log.error('Unable to get the external IP address from the provider: ' + PublicIPProvider);
    }
}

/*
//PublicIPProviders.forEach(PublicIPProvider => {
    log.info('Cheking PublicIPProvider: ' + PublicIPProvider);

    try {
        httprequest.Get(PublicIPProvider,'/',function (returnip) {
            let newip = returnip.trim();
            log.debug('OldIP: ' + oldPublicIP);
            log.debug('newIP: ' + newip);
            if (oldPublicIP != newip) {
                log.info('Public IP changed: ' + newip);
                //nconf.set('PublicIPAddress', newip);
                //nconf.save();
                
        
        
            } else {
                log.info('Public IP not changed since last check: ' + oldPublicIP);
            }
        });
        
    } catch (error) {
        log.error('Unable to get the external IP address from the provider: ' + PublicIPProvider);
        //log.error('Error: ' + error.tostring() );
    }    
//});
*/

