console.log("test");
//debugger;
console.log("test");

var str = "checkip-ipip.amazonaws.com/"
var values = str.indexOf('/')
console.log("Values: " + values);
if (values != -1) {
    console.log(values);
    console.log(str.substring(0,values));
    console.log(str.substring(values));
}
