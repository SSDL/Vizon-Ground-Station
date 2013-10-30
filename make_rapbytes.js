module.exports = function(app) {
  var event = app.event;

  function make_rapbytes(RAP,callback) {
    this.rapbytes = [];
    this.callback = callback;
    this.RAP = RAP;
    this.k = 0;
    this.nextFunc = this.func.disassemble;
    
    app.utils.log('Disssembling RAP object into bytes');
    
    this.selfevent.on('nextFunc',function() {
      _this.nextFunc();
    });
    this.selfevent.emit('nextFunc');
  }
  
  make_rapbytes.process = function(RAP,callback){
    new RAP_maker(RAP,callback);
  }
  
  // namespace placeholder
  make_rapbytes.prototype.func = {}
  
  make_rapbytes.prototype.func.disassemble = function() {
    
    /* in here, we basically want to go through each rap element in order and push bytes onto the buffer.
    
    this.rapbytes.push(function(this.RAP.element){} )
    */
    this.nextFunc = this.func.done;
    this.selfevent.emit('nextFunc');
  }
  
  make_rapbytes.prototype.func.done = function(){
    if(this.callback) this.callback(this.rapbytes);
  }
  
  return make_rapbytes;
}