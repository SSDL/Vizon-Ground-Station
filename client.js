module.exports = function(){
  var app = {}
    ;

  require('./service-groundstation.js').init(app);
  require('./service-router.js')(app);
  require('./service-port.js')(app);
  require('./service-socket.js')(app);

}();