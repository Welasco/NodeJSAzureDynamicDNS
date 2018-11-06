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

// Checking if the Public IP Address was changed
function UpdatePublicIP(){
    var PublicIPProvider = nconf.get('CheckPublicIPProvider');
    var oldPublicIP = nconf.get('PublicIPAddress');
    httprequest.Get(PublicIPProvider,'/',function (returnip) {
        let newip = returnip.trim();
        log.info('OldIP: ' + oldPublicIP);
        log.info('newIP: ' + newip);
        if (oldPublicIP != newip) {
            nconf.set('PublicIPAddress', newip);
            nconf.save();
            log.info('NewIP saved! IP: ' + newip);  
            // Call Update Azure DNS Record
            var AzureARMURI = nconf.get('ServicePrincipal:AzureARMAPIURI');
            dnsrecord.properties.ARecords[0].ipv4Address = newip;
            //dnsrecord.ARecord.properties.ARecords[0].ipv4Address = newip;
            
            let AzureSubscriptionID = nconf.get('AzureAccountDetails:AzureSubscriptionID');
            let AzureResourceGroup = nconf.get('AzureAccountDetails:AzureResourceGroup');
            let AzureDNSZone = nconf.get('AzureAccountDetails:AzureDNSZone');
            let AzureDNSRecord = nconf.get('AzureAccountDetails:AzureDNSRecord');
            let AzureARMDNSUrl = "/subscriptions/" + AzureSubscriptionID + "/resourceGroups/" + AzureResourceGroup + "/providers/Microsoft.Network/dnsZones/" + AzureDNSZone + "/A/" + AzureDNSRecord + "?api-version=2018-03-01-preview"
            httprequest.Post(AzureARMURI,AzureARMDNSUrl,dnsrecord);
            //httprequest.Post('VSANTANA-SURFAC','/api/jsonpost',dnsrecord);
        } else {
            log.info('Doing nothing since the PublicIP was not changed');
        }
    });
}

interval = setInterval(function () {
    UpdatePublicIP()
}, updateinterval);