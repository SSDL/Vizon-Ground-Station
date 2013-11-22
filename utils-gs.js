module.exports = function() {
  
  var utils =  {};
  
  // Extend the given array with the provided newdata, which can be either Buffer or Array
  utils.extendArray = function (arrcurr, datanew) {
    for(var i = 0; i < datanew.length; i++) arrcurr.push(datanew[i]);
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

  utils.toBytes = function(arrayIn, input, length) {
    if(typeof input == 'number') {
      var insertAt = arrayIn.length;
      while(true) {
        arrayIn.splice(insertAt, 0, input & 255);
        if(input < 256) break;
        input >>>= 8; // triple shift ensures non-negative result due to JS number size
      }
    } else if(typeof input == 'string') {
      for(var i = 0; i < input.length; i++) {
        arrayIn.push(input.charCodeAt(i));
      }
    } else if(Array.isArray(input)) {
      arrayIn = arrayIn.concat(input);
    }
    while(length && arrayIn.length < length && !Array.isArray(input)) {
      arrayIn.splice(0,0,0);
    }
  }
    
  return utils
}();