// GLOBALS

// Extend the given array with the provided newdata, which can be either Buffer or Array
extendArray = function (arrcurr, datanew) {
  for(var i = 0; i < datanew.length; i++) { arrcurr.push(datanew[i]); }
    //datanew.forEach(function(elem) { arrcurr.push(elem) });    
}

module.exports = function(app) {
  
  var utils =  {};
  
  utils.colors = {
    low: '\033[2m',
    error : '\033[31m',
    info: '\033[36m',
    ok: '\033[32m',
    warn: '\033[33m',
    reset: '\033[0m'
  }
    
  utils.napcolors = {
    INF: utils.colors.info,
    TAP: utils.colors.warn,
    ERR: utils.colors.error
  }
  
  utils.log = function(str,data) {
    if(app.config.dev && data) console.log();
    console.log(utils.colors.low + (new Date()).toISOString() + ' - ' + utils.colors.reset + str);
    if(app.config.dev && data) {
      console.log(data);
      console.log();
    }
  }
  
  utils.augmentChecksums = function() {
    if(arguments.length < 2) return;
    var obj = arguments[0];
    if(obj.checksumA === undefined) obj.checksumA = 0;
    if(obj.checksumB === undefined) obj.checksumB = 0;
    if(typeof arguments[1] === 'object') {
      var array = arguments[1];
      for(var k = 0; k < arguments[1].length; k++) {
        obj.checksumA = (obj.checksumA + (array[k] >>> 0)) % 256;
        obj.checksumB = (obj.checksumA + obj.checksumB) % 256;
      }
    } else {
      for(var k = 1; k < arguments.length; k++) {
        obj.checksumA = (obj.checksumA + (arguments[k] >>> 0)) % 256;
        obj.checksumB = (obj.checksumA + obj.checksumB) % 256;
      }
    }
  }

  utils.verifyChecksums = function() {
    if(arguments.length < 3) return;
    var obj = arguments[0];
    if(obj.checksumA === undefined) obj.checksumA = 0;
    if(obj.checksumB === undefined) obj.checksumB = 0;
    return (obj.checksumA == (arguments[1] >>> 0) && obj.checksumB == (arguments[2] >>> 0)) ;
  }

  // this is old code from first JS port
  utils.check_TAP_checksum = function() {
    var TAP = this.RAP.TAP;
    if(TAP.currcksmA == TAP.sentcksmA && TAP.currcksmB == TAP.sentcksmB) return 0; // checksums matched
    else return 1;
  }

  utils.bytesToNumber = function() {
    var value = 0;
    var array = arguments;
    if(arguments.length == 1)  array = arguments[0];
    for(var k in array) {
      value = (value << 8) + (array[k] >>> 0); // don't use << because large numbers roll over
    }
    return value
  }

  utils.bytesToString = function() {
    var value = '';
    var array = arguments;
    if(arguments.length == 1)  array = arguments[0];
    for(var k in array) {
      value += String.fromCharCode(array[k] >>> 0);
    }
    return value
  }

  utils.bytesToHex = function() {
    var value = 0;
    var array = arguments;
    if(arguments.length == 1)  array = arguments[0];
    for(var k in array) {
      value += (array[k] >>> 0).toString(16);
    }
    return value
  }

  utils.numberToBytes = function(arrayIn, number) {
    var insertAt = arrayIn.length;
    while(true) {
      arrayIn.splice(insertAt, 0, number & 255);
      if(number < 256) break;
      number >>>= 8; // triple shift ensures non-negative result due to JS number size
    }
  }

  utils.stringToBytes = function(arrayIn, string) {
    for(var i = 0; i < string.length; i++) {
      arrayIn.push(string.charCodeAt(i));
    }
  }
    
  return utils
}