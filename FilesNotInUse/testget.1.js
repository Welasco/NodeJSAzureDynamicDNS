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

    var CheckPublickIPProvidersURL = PublicIPProvider.indexOf('/')
    var PublickIPProviderDomain = "";
    var PublickIPProviderSuffix = "";
    if (CheckPublickIPProvidersURL != -1) {
        
        PublickIPProviderDomain = CheckPublickIPProvidersURL.substring(0,values);
        PublickIPProviderSuffix = CheckPublickIPProvidersURL.substring(CheckPublickIPProvidersURL);
    }
    else{
        PublickIPProviderDomain = PublicIPProvider;
        PublickIPProviderSuffix = "/";
    }

    log.info("PublickIPProviderDomain: " + PublickIPProviderDomain);
    log.info("PublickIPProviderSuffix: " + PublickIPProviderSuffix);

    try {
        httprequest.Get(PublickIPProviderDomain,PublickIPProviderSuffix,function (returnip) {
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
            }
            else{
                log.error("PublicIP provider returned an invalid IP Address: " + newip);
            }


        });
        //break;
        
    } catch (error) {
        log.error('Unable to get the external IP address from the provider: ' + PublicIPProvider);
        //log.error('Error: ' + error.tostring() );
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

