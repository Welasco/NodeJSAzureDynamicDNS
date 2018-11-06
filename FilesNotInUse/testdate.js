var olddate = "2018-11-05T22:38:38.657Z";
var newdate = new Date();
var testdate = new Date(olddate);
console.log(testdate);
if (testdate > newdate) {
    console.log("OldDate: " + testdate);
    console.log("New Date: " + newdate);
    console.log(testdate - newdate);
    console.log(parseInt((testdate - newdate)/60000));
}

var myNumber = undefined

function addOne(callback) {
    setTimeout(function(){
        myNumber = parseInt(1000)
        myNumber++
        if (callback) callback();
    }, 2000);
}

function logMyNumber() {
    console.log(myNumber)
}

addOne(logMyNumber)
console.log("antes de tudo");