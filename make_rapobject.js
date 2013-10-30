module.exports = function(app) {
  var event = app.event
    , make_tapobject = require('./make_tapobject.js')(app)

  function make_rapobject(rapbytes, callback) {
    var _this = this;
    this.selfevent = new (require('events').EventEmitter);
    
    this.rapbytes = rapbytes;
    this.callback = callback;
    
    this.RAP = {};
    this.k = 0;
    this.nextFunc = this.func.startsync;
    
    app.utils.log('Assembling RAP bytes into object');//,this.rapbytes);
    
    this.selfevent.on('nextFunc',function() {
      _this.nextFunc();
    });
    this.selfevent.emit('nextFunc');
  }
  
  make_rapobject.process = function(rapbytes, callback){
    new make_rapobject(rapbytes, callback);
  }
  
  // namespace placeholder
  make_rapobject.prototype.func = {}
  
  // RAP field 1, bytes 1,2, idx[0,1]
  make_rapobject.prototype.func.startsync = function() {
    if(this.rapbytes[0] != 0xAB || this.rapbytes[1] != 0xCD) {
      app.utils.log('RAP dropped - preamble wrong');
      return
    }
    app.utils.augmentChecksums(this.RAP,this.rapbytes[0],this.rapbytes[1]); 
    this.nextFunc = this.func.raplength;
    this.selfevent.emit('nextFunc');
  }
  
  // RAP field 2, byte 3, idx[2]
  make_rapobject.prototype.func.raplength = function() {
    //this.k = 2;
    //this.RAP.test1 = this.rapbytes[this.k++];
    //this.carryover = {a:6};
    
    this.RAP.length = this.rapbytes[2];
    app.utils.augmentChecksums(this.RAP,this.rapbytes[2]); 
    this.nextFunc = this.func.to;
    this.selfevent.emit('nextFunc');
  }
  
  // RAP field 3, bytes 4,5, idx[3,4]
  make_rapobject.prototype.func.to = function() {
    this.RAP.to = app.utils.bytesToNumber(this.rapbytes[3],this.rapbytes[4]); 
    app.utils.augmentChecksums(this.RAP,this.rapbytes[3],this.rapbytes[4]); 
    this.nextFunc = this.func.toflags;
    this.selfevent.emit('nextFunc');
  }
  
  // RAP field 4, byte 6, idx[5]
  make_rapobject.prototype.func.toflags = function(){
    this.RAP.toflags = this.rapbytes[5];
    app.utils.augmentChecksums(this.RAP,this.rapbytes[5]); 
    this.nextFunc = this.func.from;
    this.selfevent.emit('nextFunc');
  }
  
  // RAP field 5, bytes 7,8, idx[6,7]
  make_rapobject.prototype.func.from = function() {
    this.RAP.from = app.utils.bytesToNumber(this.rapbytes[6],this.rapbytes[7]); 
    app.utils.augmentChecksums(this.RAP,this.rapbytes[6],this.rapbytes[7]); 
    this.nextFunc = this.func.fromflags;
    this.selfevent.emit('nextFunc');
  }
  
  // RAP field 6, bytes 9, idx[8]
  make_rapobject.prototype.func.fromflags = function(){
    this.RAP.fromflags = this.rapbytes[8];
    app.utils.augmentChecksums(this.RAP,this.rapbytes[8]); 
    this.nextFunc = this.func.TAP;
    this.selfevent.emit('nextFunc');
  }
  
  // RAP field 7, bytes 10,N-2, idx[9,len-3]
  make_rapobject.prototype.func.TAP = function(){
    // this is where make_tapobject would be called similarly to how this file was called
    // it might be good to copy just the bytes that are for the tap and pass those in
    // first, it is necessary to look at the next rap byte to determine the tap appid
    // and select the correct tap maker module
    var tapbytes = this.rapbytes.slice(10,this.rapbytes.length-3);
    var appid = tapbytes[0];
    var _this = this;
    var callback = function(TAP) {
      _this.RAP.TAP = TAP; // add the tap to the RAP
      _this.selfevent.emit('nextFunc'); // have the RAP event emitter trigger the next function
    }
    this.nextFunc = this.func.checksum;
    make_tapobject['appid'+1].process(tapbytes,callback); // implementation needs to change
  }
  
  // RAP field 8, bytes N-1,N, idx[len-2,len-1]
  make_rapobject.prototype.func.checksum = function() {
    if(false && (this.RAP.currcksmA == this.RAP.sentcksmA && 
                    this.RAP.currcksmB == this.RAP.sentcksmB))  {
      app.utils.log('RAP dropped - checksum wrong');
      return
    }
    this.nextFunc = this.func.done;
    this.selfevent.emit('nextFunc');
  }
  
  make_rapobject.prototype.func.done = function(){
    if(this.callback) this.callback(this.RAP);
  }
  
  return make_rapobject;
}