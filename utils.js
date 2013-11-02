// GLOBALS

// Extend the given array with the provided newdata, which can be either Buffer or Array
extendArray = function (arrcurr, datanew) {
    datanew.forEach(function(elem) { arrcurr.push(elem) });    
}

module.exports = function(app) {
  
  var utils =  {};
  utils.log = function(str,data) {
    if(app.config.dev && data) console.log();
    console.log((new Date()).toISOString() + ' - ' + str);
    if(app.config.dev && data) {
      console.log(data);
      console.log();
    }
  }
  
  utils.randomSerialData = function(){
    setInterval(function() {
      var data = [];
      for(var i = 0; i < 10; i++) data.push(Math.floor(Math.random()*256));
      utils.log('Serial data',data);
      app.event.emit('serialRead',data);
    }, 1000);
    setInterval(function() {
      var data = [0xAB,0xCD];
      for(var i = 0; i < 8; i++) data.push(Math.floor(Math.random()*256));
      data[3] = 0x01;
      data[4] = 0x3A;
      data[9] = 0;
      utils.log('Serial data',data);
      app.event.emit('serialRead',data);
    }, 3000);
  }
  
  utils.augmentChecksums = function() {
    if(!arguments.length) return;
    var obj = arguments[0];
    if(obj.checksumA === undefined) obj.checksumA = 0;
    if(obj.checksumB === undefined) obj.checksumB = 0;
    for(var k = 1; k < arguments.length; k++) {
      obj.checksumA = (obj.checksumA + arguments[k]) % 256;
      obj.checksumB = (obj.checksumA + obj.checksumB) % 256;
    }
  }

  utils.verifyChecksums = function() {
    if(arguments.length < 3) return;
    var obj = arguments[0];
    if(obj.checksumA === undefined) obj.checksumA = 0;
    if(obj.checksumB === undefined) obj.checksumB = 0;
    return (obj.checksumA == arguments[1] && obj.checksumB == arguments[2]) ;
  }

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
      value = (value << 8) + array[k];
    }
    return value
  }
    
  return utils
}