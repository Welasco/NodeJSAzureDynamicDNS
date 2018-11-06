var AuthenticationContext = require('adal-node').AuthenticationContext;
var nconf = require('nconf');
var log = require('./logger');
nconf.file({ file: './config.json' });

var authorityHostUrl = nconf.get('ServicePrincipal:authorityHostUrl');
var tenant = nconf.get('ServicePrincipal:tenant'); // AAD Tenant name.
var authorityUrl = authorityHostUrl + '/' + tenant;
var applicationId = nconf.get('ServicePrincipal:applicationId'); // Application Id of app registered under AAD.
var clientSecret = nconf.get('ServicePrincipal:clientSecret'); // Secret generated for app. Read this environment variable.
var resource = nconf.get('ServicePrincipal:resource'); // URI that identifies the resource for which the token is valid.
var context = new AuthenticationContext(authorityUrl);

//context.acquireTokenWithClientCredentials(resource, applicationId, clientSecret, callbackacquireToken);

function callbackacquireToken(err, tokenResponse) {
    if (err) {
        log.error('Fail to create a new AADToken: ' + err.stack);
    } else {
        log.debug(JSON.stringify(tokenResponse));
        token = tokenResponse;
        var jsontoken = JSON.stringify(token);
        var jsontokenparse = JSON.parse(jsontoken);
        nconf.set('ServicePrincipal:token', jsontokenparse)
        nconf.save();
        log.info('Token updated!');
        return callback;
    }
}

function GetToken(callback) {
    
    var expiresOn = new Date(nconf.get('ServicePrincipal:token:expiresOn'));
    var currentDate = new Date();
    if (expiresOn < currentDate) {
        log.info("AADToken expired generating a new token!");
        context.acquireTokenWithClientCredentials(resource, applicationId, clientSecret, callbackacquireToken);
    } else {
        let diff = expiresOn - currentDate
        log.info("AADToken still valid for " + parseInt((diff/60000)) + " Minutes");
    }
}

//GetToken();

module.exports.GetToken = GetToken;