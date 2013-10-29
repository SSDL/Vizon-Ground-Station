module.exports = function(gsconfig,db){
  var liason = require('./liason.js');
  var tap_overhead = 12; // bytes in tap header/footer

  console.log('attempting to connect to gs5');
  console.log(gsconfig);
  var gs = require('net').connect(gsconfig, function() {
    console.log('gs5 connected');
    this.on('end', function() {
      console.log('gs5 disconnected');
      //setTimeout() // need reconnect with delay?
    })
    .on('error',function() {
      console.log('gs5 connection error');
    });
  });

  gs.prototype.init(db) {
    this.db = db;
    this.liason = new liason();
    this.RAP = {
      state: 0,
      length: 0,
      to: 0,
      toflags: 0,
      from: 0,
      fromflags: 0,
      TAP: {
        state: 0,
        appID: 0,
        length: 0,
        seqnum: 0,
        timestamp: 0,
        currcksmA: 0,
        currcksmB: 0,
        sentcksmA: 0,
        sentcksmB: 0
      },
      currcksmA: 0,
      currcksmB: 0,
      sentcksmA: 0,
      sentcksmB: 0
    };
    this.on('data', function(data) {
      for(var i in data) processRAPbyte(data[i]);
    });
  }


  gs.prototype.processRAPbyte(currbyte) {
    var RAP = this.RAP;
    // Instead of manually specifying checksum/increment in each case, follow the rules here. Sent RAP checksums are not included in final checksum calculation. TAP data does not contribute to RAP checksums, except for TAP checksums, which are handled specifically by the TAP byte processor. Let the TAP processor determine when to increment the RAP state and move out of TAP processing.
    if(RAP.state <= 8) this.add_to_RAP_checksums(currbyte); // RAP checksum should always be in a ready state
    switch (RAP.state) {
    case 0: // start of RAP, byte 1
      if(currbyte = 0xAB) RAP.state = 1; // correct byte. move to state 0
      break;
    case 1: // start of RAP, byte 2
      if(currbyte != 0xCD) RAP.state = 0; // incorrect byte. reset to state 0
      break;
    case 2: // Payload length
      RAP.length = currbyte;
      break;
    case 3: // To, upper byte
      RAP.to = 0; // do not break
    case 4: // To, lower byte
      RAP.to = this.util.make_bytes_into_one_number(RAP.to,currbyte);
      break;
    case 5: // To Flags
      // Not implemented now
      break;
    case 6: // From, upper byte
      RAP.from = 0; // do not break
    case 7: // From, lower byte
      RAP.from = this.util.make_bytes_into_one_number(RAP.from,currbyte);
      break;
    case 8: // From Flags
      // Not implemented now
      break;
    case 9: // TAP processing
      processTAPbyte();
      break;
    case 10: // Checksum A
      RAP.sentcksmA = currbyte;
      break;
    case 11: // Checksum B
      RAP.sentcksmB = currbyte;
      finalizeRAP(RAP); // do not break, allow to reset in default
    default:
      RAP.state = 0;
    }
    if(RAP.state == 0){ // if still in state 0, perform a reset
      console.log('RAP state reset');
      RAP.state = 0;
      RAP.currcksmA = 0;
      RAP.currcksmB = 0;
      RAP.TAP = {state: 0}; // reset entire TAP
      RAP.TAP.currcksmA = 0;
      RAP.TAP.currcksmB = 0;
    } else RAP.state++;
  }

  gs.prototype.processTAPbyte = function(currbyte) {
    var RAP = this.RAP;
    var TAP = RAP.TAP;
    // Instead of manually specifying checksum/increment in each case, follow the rules here. Sent TAP checksums are not included in final checksum calculation. Carton data does contribute to TAP checksums. Let the Carton processor determine when to increment the TAP state and move out of Carton processing.
    if(TAP.state <= 9 || TAP.state == 100) this.add_to_TAP_checksums(currbyte);
    switch (TAP.state) {
    case 0:
      TAP.appID = currbyte;
      break;
    case 1: 
      TAP.length = currbyte;
      break;
    case 2: // sequence number
      TAP.seqnum = 0; // do not break
    case 3:
    case 4:
    case 5: // sequence number lsb
      TAP.seqnum = this.util.make_bytes_into_one_number(TAP.seqnum,currbyte);
      break;
    case 6: // timestamp
      TAP.timestamp = currbyte; // do not break
    case 7:
    case 8: 
      TAP.timestamp = this.util.make_bytes_into_one_number(TAP.timestamp,currbyte);
      break;
    case 9: // app-specific
      if ($AppID >= 253) {  // command processing       ?????? not sure if this is > or >=, see gs5.php, lines 217 and 338
        processCommandbyte(currbyte);
      } else { // Carton processing, timestamp byte 4?
        processCartonbyte(currbyte);
        break;
      }
    case 10: // Checksum A
      TAP.sentcksmA = currbyte;
      this.add_to_RAP_checksums(currbyte);
      break;
    case 11: // Checksum B
      TAP.sentcksmB = currbyte;
      finalizeTAP();
      this.add_to_RAP_checksums(currbyte);
      break;
    default: // something unexpected, so kill the whole TAP process and restart the RAP
      console.log('TAP state reset');
      RAP.state = 0;
    }
    if(TAP.state != 11) RAP.state--; // we're not done with the TAP, so prevent the RAP from being incremented
    TAP.state++;
  }

  gs.prototype.processCartonbyte = function(currbyte) {
    // All checksum handling is done in TAP processor
    switch (Carton.state) {
    case 0:
    
    }
    while(false) {
      this.TAP.state--;
    }
    this.RAP.TAP.state++;
  }

  gs.prototype.processCommandbyte = function(currbyte) {
    var TAP = this.RAP.TAP;
    // All checksum handling is done in TAP processor
    switch (CMD.state) {
    case 0:
      if(TAP.appID = 253) CMD.CmdStatus = 2;
      if(TAP.appID = 254) CMD.CmdStatus = 3;
      break;
    case 1:
      CMD.ks = currbyte;
      break;
    case 2:
      
    }
    while(false) {
      TAP.state--;
    }
    CMD.state++;
  }

  gs.prototype.finalizeRAP = function(finalRAP) {
    var RAP = json.parse(json.stringify(finalRAP)); // shallow copy the rap so it doesn't get messed up in async calls.
    if(RAP.currcksmA == RAP.sentcksmA && RAP.currcksmB == RAP.sentcksmB) {
      db.switchDatabase($mission[0].dbname,function(err,result){
        if(err) throw err;
        switch(AppID) {
        case 253:
        case 254:
          liason.commitCmds(db);
          break;
        default:
          liason.commit(db);
        }
      });
    } else {
      console.log('RAP checksum failed, dropped');
    }
  }

  gs.prototype.finalizeTAP = function() {
    //if(finalTAP.currcksmA == finalTAP.sentcksmA && finalTAP.currcksmB == finalTAP.sentcksmB) {}
  }


  gs.prototype.add_to_RAP_checksums = function() {
    var RAP = this.RAP;
    for(var k in arguments) {
      RAP.currcksmA = (RAP.currcksmA + arguments[k]) % 256;
      RAP.currcksmB = (RAP.currcksmA + RAP.currcksmB) % 256;
    }
  }

  gs.prototype.add_to_TAP_checksums = function() {
    var TAP = this.RAP.TAP;
    for(var k in arguments) {
      TAP.currcksmA = (TAP.currcksmA + arguments[k]) % 256;
      TAP.currcksmB = (TAP.currcksmA + TAP.currcksmB) % 256;
    }
  }


  gs.prototype.check_RAP_checksum = function() {
    var RAP = this.RAP;
    if(RAP.currcksmA == RAP.sentcksmA && RAP.currcksmB == RAP.sentcksmB) return 0; // checksums matched
    else return 1;
  }

  gs.prototype.check_TAP_checksum = function() {
    var TAP = this.RAP.TAP;
    if(TAP.currcksmA == TAP.sentcksmA && TAP.currcksmB == TAP.sentcksmB) return 0; // checksums matched
    else return 1;
  }


  gs.prototype.util.make_bytes_into_one_number = function() {
    var value = 0;
    var array = arguments;
    if(arguments.length == 1)  array = arguments[0];
    for(var k in array) {
      value = (value << 8) + array[k];
    }
    return value
  }

  return gs; // new object already
}();