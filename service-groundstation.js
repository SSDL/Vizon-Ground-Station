module.exports = function(app) {
  var event = app.event
    , crypto = require('crypto')
    , utils = app.utils
    , gs = {}
    ;

  gs.rapToNAP = function rapToNAP(rapbytes, callback) {
    
    var rap = {};
    var tap = { h: {}, p: [] }
    
    
    if(rapbytes[0] != 0xAB || rapbytes[1] != 0xCD) {
      utils.log('RAP dropped - preamble wrong');
      return
    }
    utils.augmentChecksums(rap,rapbytes.slice(0,rapbytes.length-2)); 
    if((rap.checksumA != rapbytes[rapbytes.length-2]) || (rap.checksumB != rapbytes[rapbytes.length-1])) {
      utils.log('RAP dropped - checksum wrong');
      return;
    }
    rap.length = rapbytes[2];
    rap.to = utils.bytesToNumber(rapbytes[3],rapbytes[4]); 
    rap.toflags = rapbytes[5];
    rap.from = utils.bytesToNumber(rapbytes[6],rapbytes[7]); 
    rap.fromflags = rapbytes[8];
    var tapbytes = rapbytes.slice(9,rapbytes.length-2);
    if(tapbytes.length != rap.length) {
      utils.log('RAP dropped - TAP length wrong');
      return;
    }
    
    var tap_desc = app.db.d['TAP_' + tapbytes[0]];
    if(!tap_desc) {
      utils.log('RAP dropped - unknown TAP');
      return
    }
    var bytecount = 0;
    var packcount = 0;
    for(var i in tap_desc.h) {
      if(tap_desc.h[i].f) { // for each item in the tap header
        var bytesOfNumber = tapbytes.slice(bytecount, bytecount += tap_desc.h[i].l);
        tap.h[tap_desc.h[i].f] = utils.bytesToNumber(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
      }
    }
    while(bytecount < rap.length-2) { // don't count the checksums yet
      var result;
      var pack = {};
      for(var i in tap_desc.p) {
        if(tap_desc.p[i].f) { // for each item in the tap repeatable elements
          if(tap_desc.p[i].l < 0) { // variable length data
            var datalength = (tapbytes.length-3) - bytecount;
            //if(tap_desc.c[i].c && tap_desc.c[i].c == 'string')
            result = tapbytes.slice(bytecount, bytecount += datalength).toString(); // slice out bytes from current marker to just before checksum, and increase bytecount
          } else {
            var bytesOfNumber = tapbytes.slice(bytecount, bytecount += tap_desc.p[i].l);
            
            if(tap_desc.p[i].c == 'string') { // string
              result = utils.bytesToString(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
            } else if(tap_desc.p[i].c == 'hex') { // hex string
              result = utils.bytesToHex(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
            } else { // number plain
              result = utils.bytesToNumber(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
            }
            
          }
        }
        pack[tap_desc.p[i].f] = result;
      }
      tap.p[packcount] = pack;
    }
    tap.h.t = 'TAP_' + tap.h.t;
    rap.tap = tap;
    if(callback) callback(rap);
  }
  
  
  

  gs.handleSerialRead = function handleSerialRead(newdata) { // newdata can be either Buffer or Array. The extendArray function can handle either.
    extendArray(app.serialReadBuffer,newdata); // Push all buffer elements onto app.serialReadBuffer in place.
    newdata = null;
    for(var i = 1; i < app.serialReadBuffer.length-1; i++) { // Search for /next/ sync, marking end of rap
      if(app.serialReadBuffer[i] == 0xAB && app.serialReadBuffer[i+1] == 0xCD) { // found end of rap
        gs.rapToNAP(app.serialReadBuffer.splice(0,i), function(rap) { // splice out the complete rap
          var tap = rap.tap;
          tap.h.mid = rap.to;
          event.emit('socketSend','tap',tap);
          gs.logPacket(tap, 'TAP', 'to CC');
        });
        return; // stop searching for sync
      }
    }
  }
  
  
  gs.handleSerialWrite = function handleSerialWrite(data) { // Assumes data is buffer array of bytes.
    return; // do not write to serial. not ready for primetime
    port.write(data, function(err, results) {
      if(err) utils.log('err ' + err);
      if(results != 0) utils.log('results ' + results);
    });
  }
  
  
  gs.logText = function logText(text, TYPE, color) {
    if(!TYPE) TYPE = 'INF';
    if(!color) color = utils.napcolors[TYPE] || utils.colors.info;
    utils.log(color + TYPE + utils.colors.reset + ' ' + text);
  }
  
  
  gs.logPacket = function logPacket(packet, TYPE, text, hash) {
    if(!hash) hash = crypto.createHash('sha1').update(JSON.stringify(packet)).digest('hex');
    utils.log((utils.napcolors[TYPE] ? utils.napcolors[TYPE] : '') + TYPE + utils.colors.reset + ' ' + hash.substring(0,6) + ' ' + text, packet);
  }
  
  
  
  gs.handleCMD = function handleCMD(nap, text) {
  }


  // this is completely wrong now
  /*gs.handleCAP = function handleCAP(RAP) { // This receives a JSON object
    utils.log('RAP from server: ',RAP);
    if(port.connected) {
      gs.napToRAP(RAP,function(rapbytes) {
          handleSerialWrite(rapbytes);
          utils.log('Ready to write rapbytes to serial', rapbytes);
        });
    } else {
      utils.log('RAP not processed - serial port closed');
    }
  }*/
  
  return gs;
}