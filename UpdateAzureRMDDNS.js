#!/usr/bin/env node

// Azure ARM ADAL
// https://www.npmjs.com/package/adal-node
// https://www.xylos.com/en/corporate/blog/azure-resource-manager-rest-api-node-js

var nconf = require('nconf');
var dnsrecord = require('./UpdateDNSRecordSet');
var httprequest = require('./http-request');
var isIP = require('is-ip');
var log = require('./logger');

nconf.file({ file: './config.json' });

// Loading Update Interval in Minutes
var updateinterval = nconf.get('updateinterval')*60000;
log.info('UpdateInterval loaded: ' + updateinterval/60000 + " Minutes");

// Checking if the Public IP Address was changed
function UpdatePublicIP(){
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
                    nconf.set('PublicIPAddress', newip);
                    nconf.save();
                    log.debug('New Public IP saved!');
                    // Call Update Azure DNS Record
                    log.info('Loading config.json settings to build Azure URL');
                    var AzureARMURI = nconf.get('ServicePrincipal:AzureARMAPIURI');
                    dnsrecord.properties.ARecords[0].ipv4Address = newip;
                    
                    let AzureSubscriptionID = nconf.get('AzureAccountDetails:AzureSubscriptionID');
                    let AzureResourceGroup = nconf.get('AzureAccountDetails:AzureResourceGroup');
                    let AzureDNSZone = nconf.get('AzureAccountDetails:AzureDNSZone');
                    let AzureDNSRecord = nconf.get('AzureAccountDetails:AzureDNSRecord');
                    let AzureARMDNSUrl = "/subscriptions/" + AzureSubscriptionID + "/resourceGroups/" + AzureResourceGroup + "/providers/Microsoft.Network/dnsZones/" + AzureDNSZone + "/A/" + AzureDNSRecord + "?api-version=2018-03-01-preview"
                    log.debug('AzureARMURI: ' + AzureARMURI);
                    log.debug('AzureARMDNSUrl: ' + AzureARMDNSUrl);
                    log.debug('DNSRecord: ' + JSON.stringify(dnsrecord));
                    httprequest.Post(AzureARMURI,AzureARMDNSUrl,dnsrecord);
                    break;
                } else {
                    log.info('Public IP not changed since last check: ' + oldPublicIP);
                    break;
                }
            }
            else{
                log.error("PublicIP provider returned an invalid IP Address: " + newip);
            }
        } catch (error) {
            log.error('Unable to get the external IP address from the provider: ' + PublicIPProvider + ' Error: ' + error);
        }
    }
}

log.info('Starting UpdateAzureRMDDNS Loop');
UpdatePublicIP()
interval = setInterval(function () {
    UpdatePublicIP()
}, updateinterval);