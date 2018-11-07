#!/usr/bin/env node

// Azure ARM ADAL
// https://www.npmjs.com/package/adal-node
// https://www.xylos.com/en/corporate/blog/azure-resource-manager-rest-api-node-js

var nconf = require('nconf');
var dnsrecord = require('./UpdateDNSRecordSet');
var httprequest = require('./http-request');
var log = require('./logger');

nconf.file({ file: './config.json' });

/*
function turnOnLogging() {
    var log = adal.Logging;
    log.setLoggingOptions(
    {
      level : log.LOGGING_LEVEL.VERBOSE,
      log : function(level, message, error) {
        console.log(message);
        if (error) {
          console.log(error);
        }
      }
    });
  }
turnOnLogging() 
*/

// Loading Update Interval
var updateinterval = nconf.get('updateinterval');
log.debug('UpdateInterval loaded: ' + updateinterval);

// Checking if the Public IP Address was changed
function UpdatePublicIP(){
    var PublicIPProvider = nconf.get('CheckPublicIPProvider');
    var oldPublicIP = nconf.get('PublicIPAddress');
    httprequest.Get(PublicIPProvider,'/',function (returnip) {
        let newip = returnip.trim();
        log.debug('OldIP: ' + oldPublicIP);
        log.debug('newIP: ' + newip);
        if (oldPublicIP != newip) {
            log.info('Public IP changed: ' + newip);
            nconf.set('PublicIPAddress', newip);
            nconf.save();
            log.debug('New Public IP saved!');
            // Call Update Azure DNS Record

            log.debug('Loading config.json settings to build Azure URL');
            var AzureARMURI = nconf.get('ServicePrincipal:AzureARMAPIURI');
            dnsrecord.properties.ARecords[0].ipv4Address = newip;
            //dnsrecord.ARecord.properties.ARecords[0].ipv4Address = newip;
            
            let AzureSubscriptionID = nconf.get('AzureAccountDetails:AzureSubscriptionID');
            let AzureResourceGroup = nconf.get('AzureAccountDetails:AzureResourceGroup');
            let AzureDNSZone = nconf.get('AzureAccountDetails:AzureDNSZone');
            let AzureDNSRecord = nconf.get('AzureAccountDetails:AzureDNSRecord');
            let AzureARMDNSUrl = "/subscriptions/" + AzureSubscriptionID + "/resourceGroups/" + AzureResourceGroup + "/providers/Microsoft.Network/dnsZones/" + AzureDNSZone + "/A/" + AzureDNSRecord + "?api-version=2018-03-01-preview"
            log.debug('AzureARMURI: ' + AzureARMURI);
            log.debug('AzureARMDNSUrl: ' + AzureARMDNSUrl);
            log.debug('DNSRecord: ' + JSON.stringify(dnsrecord));
            httprequest.Post(AzureARMURI,AzureARMDNSUrl,dnsrecord);
            //httprequest.Post('VSANTANA-SURFAC','/api/jsonpost',dnsrecord);
        } else {
            log.info('Public IP not changed since last check: ' + oldPublicIP);
        }
    });
}

log.info('Starting UpdateAzureRMDDNS Loop');
interval = setInterval(function () {
    UpdatePublicIP()
}, updateinterval);