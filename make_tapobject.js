module.exports = function(app) {
  var event = app.event;

  // -------- Begin TAP ID 1 -----------------
  function make_tapobject_appid1(tapbytes,callback) {
    var _this = this;
    this.selfevent = new (require('events').EventEmitter);
    
    this.tapbytes = tapbytes;
    this.callback = callback;
    
    this.tap = {};
    this.k = 0;
    this.nextFunc = this.func.test;
    
    app.utils.log('Assembling TAP bytes into object');
    
    this.selfevent.on('nextFunc',function() {
      _this.nextFunc();
    });
    this.selfevent.emit('nextFunc');
  }
  
  make_tapobject_appid1.process = function(tapbytes,callback){
    new make_tapobject_appid1(tapbytes,callback);
  }
  
  make_tapobject_appid1.prototype.func = {}
  
  make_tapobject_appid1.prototype.func.test = function(){
    this.tap.typeid = this.tapbytes[0];
    this.tap.demo = Math.floor(Math.random()*256);
    this.nextFunc = this.func.done;
    this.selfevent.emit('nextFunc');
  }
  
  make_tapobject_appid1.prototype.func.done = function(){
    if(this.callback) this.callback(this.tap)
  }
  // -------- End TAP ID 1 -----------------
  
  return {
    appid1: make_tapobject_appid1
  };
}