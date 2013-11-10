module.exports = function(app) {
  var event = app.event
    , crypto = require('crypto')
    , gs = {}
    ;

  gs.rapToNAP = function rapToNAP(rapbytes, callback) {
    
    var rap = {};
    var tap = { h: {}, p: [] }
    
    
  // RAP field 1, bytes 1,2, idx[0,1]
    if(rapbytes[0] != 0xAB || rapbytes[1] != 0xCD) {
      app.utils.log('RAP dropped - preamble wrong');
      return
    }
  // RAP field 8, bytes N-1,N, idx[len-2,len-1]. Do this early so we don't waste time processing a bad RAP
    app.utils.augmentChecksums(rap,rapbytes.slice(0,rapbytes.length-2)); 
    if((rap.checksumA != rapbytes[rapbytes.length-2]) || (rap.checksumB != rapbytes[rapbytes.length-1])) {
      app.utils.log('RAP dropped - checksum wrong');
      return;
    }
  // RAP field 2, byte 3, idx[2]
    rap.length = rapbytes[2];
  // RAP field 3, bytes 4,5, idx[3,4]
    rap.to = app.utils.bytesToNumber(rapbytes[3],rapbytes[4]); 
  // RAP field 4, byte 6, idx[5]
    rap.toflags = rapbytes[5];
  // RAP field 5, bytes 7,8, idx[6,7]
    rap.from = app.utils.bytesToNumber(rapbytes[6],rapbytes[7]); 
  // RAP field 6, bytes 9, idx[8]
    rap.fromflags = rapbytes[8];
  // RAP field 7, bytes 10,N-2, idx[9,len-3]
    var tapbytes = rapbytes.slice(9,rapbytes.length-2);
    if(tapbytes.length != rap.length) {
      app.utils.log('RAP dropped - TAP length wrong');
      return;
    }
    
    var tap_desc = app.db.d['TAP_' + tapbytes[0]];
    if(!tap_desc) {
      app.utils.log('RAP dropped - unknown TAP');
      return
    }
    var bytecount = 0;
    var packcount = 0;
    for(var i in tap_desc.h) {
      if(tap_desc.h[i].f) { // for each item in the tap header
        var bytesOfNumber = tapbytes.slice(bytecount, bytecount += tap_desc.h[i].l);
        tap.h[tap_desc.h[i].f] = app.utils.bytesToNumber(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
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
              result = app.utils.bytesToString(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
            } else if(tap_desc.p[i].c == 'hex') { // hex string
              result = app.utils.bytesToHex(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
            } else { // number plain
              result = app.utils.bytesToNumber(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
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
    for(var i = 1; i < app.serialReadBuffer.length-1; i++) { // Search for /next/ sync, marking end of rap
      if(app.serialReadBuffer[i] == 0xAB && app.serialReadBuffer[i+1] == 0xCD) { // found end of rap
        gs.rapToNAP(app.serialReadBuffer.splice(0,i), function(rap) { // splice out the complete rap
          var nap = gs.createNAP();
          nap.h.mid = rap.to;
          nap.p = rap.tap;
          gs.sendNAP(nap);
        });
        return; // stop searching for sync
      }
    }
  }
  
  
  gs.handleSerialWrite = function handleSerialWrite(data) { // Assumes data is buffer array of bytes.
    return; // do not write to serial. not ready for primetime
    port.write(data, function(err, results) {
      if(err) app.utils.log('err ' + err);
      if(results != 0) app.utils.log('results ' + results);
    });
  }
  
  
  
  gs.logNAP = function logNAP(nap, text) {
    var typeid = nap.p.h.t.split('_')[0];
    if(!text) text = (nap.p && nap.p.t ? nap.p.t : '');
    app.utils.log((app.utils.napcolors[typeid] ? app.utils.napcolors[typeid] : '') + typeid + app.utils.colors.reset + ' ' + nap.s.h.substring(0,6) + ' ' + text, nap);
  }
  
  
  
  gs.handleCMD = function logNAP(nap, text) {
    switch(nap.p.h.t.split('_')[1]) {
    case 'dbsync':
      app.utils.log(app.utils.colors.info + 'INF' + app.utils.colors.reset + ' DB sync with Control Center');
      app.db = dbitems;
      break;
    case 'ping':
      break;
    default:
      gs.logNAP(nap, 'ignored: unknown');
    }
    
  }


  // this is completely wrong now
  /*gs.handleCAP = function handleCAP(RAP) { // This receives a JSON object
    app.utils.log('RAP from server: ',RAP);
    if(port.connected) {
      gs.napToRAP(RAP,function(rapbytes) {
          handleSerialWrite(rapbytes);
          app.utils.log('Ready to write rapbytes to serial', rapbytes);
        });
    } else {
      app.utils.log('RAP not processed - serial port closed');
    }
  }*/
  
  gs.createNAP = function createNAP() {
    var nap = {
      h: {
        gsid: app.config.gsid
      },
      p: {}
    }
    return nap;
  }
  
  gs.sendNAP = function sendNAP(nap, callback) {
    gs.signNAP(nap, function(_nap){
      socket.emit('NAP',nap);
      gs.logNAP(nap, 'transmitted to Control Center');
      if(callback) callback(nap);
    });
  }
  
  
  gs.signNAP = function signNAP(nap, callback) {
    nap.s = {
      a: 'sha1',
      e: 'base64'
    };
    nap.s.h = crypto.createHmac(nap.s.a, app.config.key)
      .update(JSON.stringify(nap.h) + JSON.stringify(nap.p))
      .digest(nap.s.e);
    if(callback) callback(nap);
  }
  
  
  gs.authenticateNAP = function authenticateNAP(nap, callback) {
    var hmac = crypto.createHmac(nap.s.a, app.config.key)
      .update(JSON.stringify(nap.h) + JSON.stringify(nap.p))
      .digest(nap.s.e);
    if(callback) callback(nap, nap.s.h == hmac);
  }
  
  return gs;
}