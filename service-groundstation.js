var gs = exports
  , app = {}
  , utils = require('./utils.js')
  , utils_gs = require('./utils-gs.js')
  , config = require('./config.js')
  , serialReadBuffer = [];
  ;
  
exports.init = function(_app) {
  app = _app;
  app.db = { descriptors: { } };
  app.event = new (require('events').EventEmitter);
    
  console.log();
  utils.logText('Ground Station starting in ' + utils.colors.warn + config.env + utils.colors.reset+ ' mode', 'INF');
}

exports.loadDescriptor = function(desc_typeid, callback) {
  if(app.db.descriptors[desc_typeid]) callback(app.db.descriptors[desc_typeid]);
  else {
    app.event.emit('socket-send','descriptor-request', desc_typeid, function(new_descriptors) {
      if(new_descriptors.length) {
        utils.logText('Descriptor ' + desc_typeid + ' retrieved from CC');
        for(var i in new_descriptors)
          app.db.descriptors[desc_typeid] = new_descriptors[i];
        callback(app.db.descriptors[desc_typeid]);
      } else
        utils.logText('RAP dropped - descriptor not available from CC');
    });
  }
}

exports.handleTAP = function(rapbytes, callback) {
  var rap = {};
  
  if(rapbytes.length < 11) return; // This should protect all indexing below
  if(rapbytes[0] != 0xAB || rapbytes[1] != 0xCD) {
    utils.logText('RAP dropped - wrong preamble', 'INF', utils.colors.warn);
    return
  }
  utils_gs.augmentChecksums(rap, rapbytes.slice(0, rapbytes.length-2)); 
  //if((rap.checksumA != rapbytes[rapbytes.length-2]) || (rap.checksumB != rapbytes[rapbytes.length-1])) {
  if(!utils_gs.verifyChecksums(rap, rapbytes[rapbytes.length-2], rapbytes[rapbytes.length-1])) {
    utils.logText('TAP dropped - wrong RAP checksum', 'INF', utils.colors.warn);
    return;
  }
  
  rap.length = rapbytes[2];
  rap.to = utils_gs.bytesToNumber(rapbytes[3],rapbytes[4]);
  rap.toflags = rapbytes[5];
  rap.from = utils_gs.bytesToNumber(rapbytes[6],rapbytes[7]);
  rap.fromflags = rapbytes[8];
  
  var tapbytes = rapbytes.slice(9,rapbytes.length-2);
  
  var desc_typeid = 'TAP_' + tapbytes[0];
  exports.loadDescriptor(desc_typeid, function(tap_desc){
    if(app.db.descriptors[desc_typeid])
      exports.doRAPtoTAP(rap, tapbytes, tap_desc, function(tap) {
        tap.h.mid = rap.from;
        app.event.emit('socket-send','tap',tap);
        utils.logPacket(tap, 'TAP', 'to CC');
      });
  });
  
}

exports.handleCAP = function(cap, callback) {
  if(!(cap.h && cap.h.t)) {
    utils.logText('CAP dropped - no type field', 'INF', utils.colors.warn);
  var desc_typeid = cap.h.t;
  exports.loadDescriptor(desc_typeid, function(cap_desc){
    if(app.db.descriptors[desc_typeid])
      exports.doCAPtoRAP(cap, cap_desc, function(capbytes){
        var rap = {};
        var rapbytes = [];
        utils_gs.toBytes(rapbytes, 0xABCD); // sync flag
        utils_gs.toBytes(rapbytes, capbytes.length); // payload length
        utils_gs.toBytes(rapbytes, cap.h.mid); // to
        utils_gs.toBytes(rapbytes, 0); // to flags
        utils_gs.toBytes(rapbytes, 0,2); // from
        utils_gs.toBytes(rapbytes, 0); // fromflags
        utils_gs.toBytes(rapbytes, capbytes);
        utils_gs.augmentChecksums(rap, rapbytes); 
        utils_gs.toBytes(rapbytes, rap.checksumA); // checksumA
        utils_gs.toBytes(rapbytes, rap.checksumB); // checksumB
      });
  });
  
}

exports.doRAPtoTAP = function(rap, tapbytes, tap_desc, callback) {
  if(tapbytes.length != rap.length) {
    utils.logText('TAP dropped - wrong length', 'INF', utils.colors.warn);
    return;
  }
  
  var bytecount = 0;
  var h = {};
  for(var i in tap_desc.h) {
    if(tap_desc.h[i].f) { // for each item in the tap header
      var bytesOfNumber = tapbytes.slice(bytecount, bytecount += tap_desc.h[i].l);
      h[tap_desc.h[i].f] = utils_gs.bytesToNumber(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
    }
  }
  h.t = 'TAP_' + h.t;
  while(bytecount < rap.length-2) { // don't count the checksums yet, but we're going to loop over every pack in the tap
    var tap = { h: h, p: {} }
    var result;
    for(var i in tap_desc.p) {
      if(tap_desc.p[i].f) { // for each item in the tap repeatable elements
        if(tap_desc.p[i].l < 0) { // variable length data
          var datalength = (tapbytes.length-3) - bytecount;
          //if(tap_desc.c[i].c && tap_desc.c[i].c == 'string')
          result = tapbytes.slice(bytecount, bytecount += datalength).toString(); // slice out bytes from current marker to just before checksum, and increase bytecount
        } else {
          var bytesOfNumber = tapbytes.slice(bytecount, bytecount += tap_desc.p[i].l);
          
          if(tap_desc.p[i].c == 'string') { // string
            result = utils_gs.bytesToString(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
          } else if(tap_desc.p[i].c == 'hex') { // hex string
            result = utils_gs.bytesToHex(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
          } else { // number plain
            result = utils_gs.bytesToNumber(bytesOfNumber); // slice out the correct number of bytes, form number, and increase bytecount
          }
          
        }
      }
      tap.p[tap_desc.p[i].f] = result;
    }
    if(callback) callback(tap);
  }
}

exports.doCAPtoRAP = function(cap, cap_desc, callback) {
  var capbytes = [];
  var bytecount = 0;
  var h = {};
  for(var i in cap_desc.h) {
    if(cap_desc.h[i].f) { // for each item in the cap header
      if(!cap.h[cap_desc.h[i].f] || cap_desc.h[i].f == 'l') { // if a field is missing, and that field is not the cap length
        utils.logText('CAP dropped - missing field ' + cap_desc.p[i].f, 'INF', utils.colors.warn);
        return;
      }
      utils.toBytes(capbytes,cap.h[cap_desc.h[i].f], cap_desc.h[i].l); // convert the correct field to bytes (with padding) and push them on to capbytes
    }
  }
  for(var i in cap_desc.p) {
    if(cap_desc.p[i].f) { // for each item in the cap header
      if(!cap.p[cap_desc.p[i].f]) { // if a field is missing
        utils.logText('CAP dropped - missing field ' + cap_desc.p[i].f, 'INF', utils.colors.warn);
        return;
      }
      utils.toBytes(capbytes,cap.p[cap_desc.p[i].f], cap_desc.p[i].l); // convert the correct field to bytes (with padding) and push them on to capbytes
    }
  }
  utils_gs.augmentChecksums(cap, capbytes);
  capbytes.splice(1,0,capbytes.length+1); // splice the total cap bytes length (+1 for the length byte) into the cap bytes
  if(callback) callback(capbytes);
}


exports.handleSerialRead = function(newdata) { // newdata can be either Buffer or Array. The extendArray function can handle either.
  utils_gs.extendArray(serialReadBuffer,newdata); // Push all buffer elements onto serialReadBuffer in place.
  var rapbytes = [];
  if(serialReadBuffer.length == 11 + serialReadBuffer[2]) { // check if the number of bytes in the buffer equals the length of rap+payload
    rapbytes = serialReadBuffer.splice(0,serialReadBuffer.length); // splice out all elements
  } else {
    for(var i = 1; i < serialReadBuffer.length-1; i++) { // Search for /next/ sync, marking end of rap. this is used for first sync or resync
      if(serialReadBuffer[i] == 0xAB && serialReadBuffer[i+1] == 0xCD) { // found end of rap
        rapbytes = serialReadBuffer.splice(0,i); // splice out all elements before the newly found sync marker
        return; // stop searching for sync
      }
    }
  }
  if(rapbytes.length) gs.handleTAP(rapbytes);
}


exports.handleSerialWrite = function(data) { // Assumes data is buffer array of bytes.
  console.log(data);
  return;
  port.write(new Buffer(data), function(err, results) {
    if(err) utils.log('err ' + err);
    if(results != 0) utils.log('results ' + results);
  });
}



exports.handleCMD = function(nap, text) {
}
