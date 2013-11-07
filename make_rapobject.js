module.exports = function(app) {
  var event = app.event;

  function make_rapobject(rapbytes, callback) {
    var _this = this;
    
    this.rapbytes = rapbytes;
    this.callback = callback;
    
    this.rap = {};
    
    
  // RAP field 1, bytes 1,2, idx[0,1]
    if(this.rapbytes[0] != 0xAB || this.rapbytes[1] != 0xCD) {
      app.utils.log('RAP dropped - preamble wrong');
      return
    }
  // RAP field 8, bytes N-1,N, idx[len-2,len-1]. Do this early so we don't waste time processing a bad RAP
    app.utils.augmentChecksums(this.rap,this.rapbytes.slice(0,this.rapbytes.length-2)); 
    if(false && (this.rap.checksumA != this.rap.rapbytes[this.rapbytes.length-2] || this.rap.checksumB != this.rap.rapbytes[this.rapbytes.length-1])) {
      app.utils.log('RAP dropped - checksum wrong');
      return;
    }
  // RAP field 2, byte 3, idx[2]
    this.rap.length = this.rapbytes[2];
  // RAP field 3, bytes 4,5, idx[3,4]
    this.rap.to = app.utils.bytesToNumber(this.rapbytes[3],this.rapbytes[4]); 
  // RAP field 4, byte 6, idx[5]
    this.rap.toflags = this.rapbytes[5];
  // RAP field 5, bytes 7,8, idx[6,7]
    this.rap.from = app.utils.bytesToNumber(this.rapbytes[6],this.rapbytes[7]); 
  // RAP field 6, bytes 9, idx[8]
    this.rap.fromflags = this.rapbytes[8];
  // RAP field 7, bytes 10,N-2, idx[9,len-3]
    var tapbytes = this.rapbytes.slice(9,this.rapbytes.length-2);
    if(tapbytes.length != this.rap.length) {
      app.utils.log('RAP dropped - TAP length wrong');
      return;
    }
    
    this.tap = { h: {}, p: {} }
    var tap_desc = app.db.descriptors['TAP_' + tapbytes[0]];
    if(!tap_desc) {
      app.utils.log('RAP dropped - unknown TAP');
      return
    }
    var count = 2; // we don't need tapid or length
    for(var i in tap_desc.h) {
      if(tap_desc.h[i].f) { // for each item in the tap header
        var bytesOfNumber = tapbytes.slice(count, count += tap_desc.h[i].l);
        this.tap.h[tap_desc.h[i].f] = app.utils.bytesToNumber(bytesOfNumber); // slice out the correct number of bytes, form number, and increase count
      }
    }
    while(count < this.rap.length-2) { // don't count the checksums yet
      var result;
      for(var i in tap_desc.p) {
        if(tap_desc.p[i].f) { // for each item in the tap repeatable elements
          if(tap_desc.p[i].l < 0) { // variable length data
            var datalength = (tapbytes.length-3) - count;
            //if(tap_desc.c[i].c && tap_desc.c[i].c == 'string')
            result = tapbytes.slice(count, count += datalength).toString(); // slice out bytes from current marker to just before checksum, and increase count
          } else {
            var bytesOfNumber = tapbytes.slice(count, count += tap_desc.p[i].l);
            
            if(tap_desc.p[i].c == 'string') { // string
              result = app.utils.bytesToString(bytesOfNumber); // slice out the correct number of bytes, form number, and increase count
            } else if(tap_desc.p[i].c == 'hex') { // hex string
              result = app.utils.bytesToHex(bytesOfNumber); // slice out the correct number of bytes, form number, and increase count
            } else { // number plain
              result = app.utils.bytesToNumber(bytesOfNumber); // slice out the correct number of bytes, form number, and increase count
            }
            
          }
        }
        this.tap.p[tap_desc.p[i].f] = result;
      }
    }
    this.rap.tap = this.tap;
    console.log(this.rap);
    if(this.callback) this.callback(this.rap);
  }
    
    
    
  
  make_rapobject.process = function(rapbytes, callback){
    new make_rapobject(rapbytes, callback);
  }
  
  return make_rapobject;
}