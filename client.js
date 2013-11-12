module.exports = function(){
  var os = require("os")
    , app = {}
    , event = app.event = new (require('events').EventEmitter)
    , config = app.config = require('./config.js')(app)
    ;

    // placeholder objects. thse must exist here so that function callbacks can reference them
    app.db = {}; // database items to request from server
    app.serialReadBuffer = [];

  // tools and utilities
    app.utils = require('./utils.js')(app);
    app.gs = require('./service-groundstation.js')(app);
    app.port = require('./service-port.js')(app);
    app.socket = require('./service-socket.js')(app);
    
    
  app.utils.log('Vizon Ground Station starting on ' + os.hostname());
  app.utils.log('Starting in ' + app.utils.colors.info + app.config.env + app.utils.colors.reset+ ' environment')
  console.log();

}();