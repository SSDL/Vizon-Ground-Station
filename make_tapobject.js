module.exports = function(app) {
  var event = app.event;

  // -------- Begin TAP ID 1 -----------------
  function make_tapobject_0(tapbytes,callback) {
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
  
  make_tapobject_0.process = function(tapbytes,callback){
    new make_tapobject_0(tapbytes,callback);
  }
  
  make_tapobject_0.prototype.func = {}
  
  make_tapobject_0.prototype.func.test = function(){
    this.tap.typeid = 'TAP_'+this.tapbytes[0];
    this.nextFunc = this.func.done;
    this.selfevent.emit('nextFunc');
  }
  
  make_tapobject_0.prototype.func.done = function(){
    if(this.callback) this.callback(this.tap)
  }
  // -------- End TAP ID 1 -----------------
  
  return {
    0: make_tapobject_0
  };
}