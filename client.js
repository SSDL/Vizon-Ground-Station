module.exports = function(){
  var app = {}
    , look = require('look').start()
    ;

  require('./service-groundstation.js').init(app);
  require('./service-router.js')(app);
  require('./service-port.js')(app);
  require('./service-socket.js')(app);

}();