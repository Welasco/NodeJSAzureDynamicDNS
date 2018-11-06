var nconf = require('nconf');
nconf.file({ file: './config.json' });
var PublicIPProvider = nconf.get('CheckPublicIPProvider');
var oldPublicIP = nconf.get('PublicIPAddress');
var updateinterval = nconf.get('updateinterval');

//console.log("PublicIPProvider:" + PublicIPProvider + " OldIP: " + oldPublicIP + " UpdateInterval: " + updateinterval);

let AzureSubscriptionID = nconf.get('AzureAccountDetails:AzureSubscriptionID');
let AzureResourceGroup = nconf.get('AzureAccountDetails:AzureResourceGroup');
let AzureDNSZone = nconf.get('AzureAccountDetails:AzureDNSZone');
let AzureDNSRecord = nconf.get('AzureAccountDetails:AzureDNSRecord');
let AzureARMDNSUrl = "/subscriptions/" + AzureSubscriptionID + "/resourceGroups/" + AzureResourceGroup + "/providers/Microsoft.Network/dnsZones/" + AzureDNSZone + "/A/" + AzureDNSRecord + "?api-version=2018-03-01-preview"

console.log(AzureARMDNSUrl);

