$fPath = "C:\Program Files\WindowsPowerShell\Modules\AzureRM.profile\4.6.0"
$adal = "$fPath\Microsoft.IdentityModel.Clients.ActiveDirectory.dll"
$adalforms = "$fPath\Microsoft.IdentityModel.Clients.ActiveDirectory.WindowsForms.dll"
[System.Reflection.Assembly]::LoadFrom($adal) | Out-Null
[System.Reflection.Assembly]::LoadFrom($adalforms) | Out-Null

function auth-azure
{
    $adTenant = 'victorhepoca.onmicrosoft.com' 
    $resourceAppIdURI =  "https://management.core.windows.net/"
    $authority = "https://login.windows.net/$adTenant"
    #$clientId = "bb87c025-0ebb-40b2-ab37-5e923f2ba36b" 
    $applicationId = "ecae79c9-b0b1-4ddf-bfbe-8518421bcfb8"
    $redirectUri = "http://ConsoleTokenSQLGraph2"
    $authContext = New-Object "Microsoft.IdentityModel.Clients.ActiveDirectory.AuthenticationContext" -ArgumentList $authority
    $certificateCredential = New-Object -TypeName Microsoft.IdentityModel.Clients.ActiveDirectory.ClientCredential -ArgumentList ($applicationId, "-&cO@}@ZRMRO&O%%D)HB)EufZ{b@d17;Bi/k|u+}]U?7a%|+)uJ")
    $authResults = $authContext.AcquireToken($resourceAppIdURI, $certificateCredential)
    return $AuthResults
}
$returntoken = auth-azure
$authtoken = $returntoken.AccessToken

#https://powershell.org/forums/topic/curl-to-invoke-restmethod-conversion/
#GET https://management.azure.com/subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}?api-version=2018-02-01

  $SubscriptionID = "d3a942c2-e14d-40a7-9727-d5d70b91d05c"
  $baseuri = "https://management.azure.com/"
  $suffixURI = "?api-version=2018-05-01" #?api-version=2018-02-01 "?api-version=2016-09-01"

  $Subscription = $baseuri + "/subscriptions/$SubscriptionID"

  $restcommandcall = "/resourcegroups/ExternalDNS/resources"
  #$restcommandcall = "/resourcegroups/aks"

  $fullURI = $Subscription + $restcommandcall + $suffixURI
  #$fullURI = $Subscription + $suffixURI

  $fullURI = "https://management.azure.com/subscriptions/$SubscriptionID/resourceGroups/ExternalDNS/providers/Microsoft.Network/dnsZones/hepoca.com?api-version=2018-03-01-preview"
  $fullURI = "https://management.azure.com/subscriptions/$SubscriptionID/resourceGroups/ExternalDNS/providers/Microsoft.Network/dnsZones/hepoca.com/A/www?api-version=2018-03-01-preview"

  $params = @{
    ContentType = 'application/json'
    Headers = @{
        'authorization'="Bearer $($authtoken)"
    }
    Method = 'Get'
    URI = $fullURI
  }

  $response = Invoke-RestMethod @params
  $response | ConvertTo-Json

  $response = $null
  $authtoken = $null

  "https://management.azure.com/subscriptions/$SubscriptionID/resourceGroups/ExternalDNS/providers/Microsoft.Network/dnsZones/hepoca.com?api-version=2018-03-01-preview"

  GET https://management.azure.com/subscriptions/$SubscriptionID/resourceGroups/ExternalDNS/providers/Microsoft.Network/dnsZones/hepoca.com/A/www?api-version=2018-03-01-preview

$authtoken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IndVTG1ZZnNxZFF1V3RWXy1oeFZ0REpKWk00USIsImtpZCI6IndVTG1ZZnNxZFF1V3RWXy1oeFZ0REpKWk00USJ9.eyJhdWQiOiJodHRwczovL21hbmFnZW1lbnQuY29yZS53aW5kb3dzLm5ldC8iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC80MzdlNDk1YS1lYjNmLTRiZTUtYThmZS05YTAzMDI4OTJmODIvIiwiaWF0IjoxNTQxNDgzMjEyLCJuYmYiOjE1NDE0ODMyMTIsImV4cCI6MTU0MTQ4NzExMiwiYWlvIjoiNDJSZ1lKZzczMC9oSDZ1VHF1VFNYK2RYQnQ1U0F3QT0iLCJhcHBpZCI6ImVjYWU3OWM5LWIwYjEtNGRkZi1iZmJlLTg1MTg0MjFiY2ZiOCIsImFwcGlkYWNyIjoiMSIsImVfZXhwIjoyNjI4MDAsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzQzN2U0OTVhLWViM2YtNGJlNS1hOGZlLTlhMDMwMjg5MmY4Mi8iLCJvaWQiOiI3YTY4YmIwMy03YzY1LTQzM2EtOWEzNS0yZGU3ZTU5M2ExZDQiLCJzdWIiOiI3YTY4YmIwMy03YzY1LTQzM2EtOWEzNS0yZGU3ZTU5M2ExZDQiLCJ0aWQiOiI0MzdlNDk1YS1lYjNmLTRiZTUtYThmZS05YTAzMDI4OTJmODIiLCJ1dGkiOiJxQ2kzTlN6alRreUR5cVU4LTFKaEFBIiwidmVyIjoiMS4wIn0.UOJnh8GvyuS0cFSrxQlocEHxQ04oUwN3DiuO_omHCmoTWjJ05tYo52Y9WTCJIcrTKDCWQebJ-jAMevG8jQz0VjffI_syyUJdtEioQcZPYOo1sm9qYtDn5z-buI6eOusje5KT5dvD7DFhXY58DyjI8Kui7ed2CvAdd4Oqlx71PQTbMydbCAOc1orMsBAq7c5M3sZFCeoqkuJdV1y_M_5HDavoWoiIlqaD5xDXavRNqQyO09iKPCerkmRzh5YtEq9BZIdcJf0z57Nxb_-O8xIN0BG5EPssGxmuM8w-OddMsM2TMGjpzhA0h6Z_Foh6p5OFz7IZ5bMZ56MZ8LYNU42WGA"


$fullURI = "https://management.azure.com/subscriptions/$SubscriptionID/resourceGroups/ExternalDNS/providers/Microsoft.Network/dnsZones/hepoca.com/A/record1?api-version=2018-03-01-preview"


$BODY = @'
{
  "properties": {
    "metadata": {
      "key1": "value1"
    },
    "TTL": 3600,
    "ARecords": [
      {
        "ipv4Address": "127.0.0.3"
      }
    ]
  }
}
'@

$params = @{
    ContentType = 'application/json'
    Headers = @{
        'authorization'="Bearer $($authtoken)"
    }
    Method = 'PUT'
    URI = $fullURI
    Body = $BODY
}

$response = Invoke-RestMethod @params
$response | ConvertTo-Json




# Get Public IP Address

(Invoke-WebRequest http://icanhazip.com/).RawContent
(Invoke-WebRequest http://bot.whatismyipaddress.com/).RawContent
(Invoke-WebRequest http://ipinfo.io/ip).RawContent
(Invoke-WebRequest https://api.ipify.org).RawContent
(Invoke-WebRequest https://ipinfo.io/ip).RawContent
(Invoke-WebRequest http://checkip.amazonaws.com/).RawContent
(Invoke-WebRequest https://wtfismyip.com/text).RawContent
(Invoke-WebRequest https://ipv4.icanhazip.com/).RawContent
(Invoke-WebRequest http://ipecho.net/plain).RawContent

Invoke-RestMethod http://icanhazip.com/
Invoke-RestMethod http://bot.whatismyipaddress.com/
Invoke-RestMethod http://ipinfo.io/ip
Invoke-RestMethod https://api.ipify.org
Invoke-RestMethod https://ipinfo.io/ip
Invoke-RestMethod http://checkip.amazonaws.com/
Invoke-RestMethod https://wtfismyip.com/text
Invoke-RestMethod https://ipv4.icanhazip.com/
Invoke-RestMethod http://ipecho.net/plain

Invoke-RestMethod http://ifconfig.me
Invoke-RestMethod http://ifconfig.co

# Curl Only
#ifconfig.co
#ifconfig.me
