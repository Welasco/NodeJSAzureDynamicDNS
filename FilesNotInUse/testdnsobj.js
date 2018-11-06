var dnsrecord = require('./UpdateDNSRecordSet');
console.log(dnsrecord.ARecord.properties.ARecords[0].ipv4Address)
dnsrecord.ARecord.properties.ARecords[0].ipv4Address = "192.168.0.1"
console.log(dnsrecord.ARecord.properties.ARecords[0].ipv4Address)
console.log(JSON.stringify(dnsrecord))