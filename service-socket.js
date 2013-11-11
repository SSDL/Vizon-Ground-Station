module.exports = function(app) {
  var event = app.event
    , io = require('socket.io-client')
    , crypto = require('crypto')
    , utils = app.utils
    , gs = app.gs
    ;

  //   ----------------   Begin Socket Setup   ----------------
  var socketRetry = setInterval(function() { // this is the only way to loop if not connected
    utils.log(gs.logText('Server connection failed - Retry in 10s...', 'ERR') );
    socket.socket.connect();
  }, 10000);

  socket = io.connect(app.config.cc.uri, app.config.cc.options)
  // handle standard socket events
  .on('connect', function() {
    clearInterval(socketRetry);
    socket.emit('auth-initiate', app.config.gsid);
    gs.logText('Connected to CC');
  })
  .on('disconnect', function() {
    utils.log('Connection to CC closed');
    event.removeListener('serialRead',gs.handleSerialRead);
  })
  .on('connecting', function() { gs.logText('Connecting to CC...'); })
  .on('connect_failed', function() { gs.logText('Connection to CC failed'); })
  .on('reconnecting', function() { gs.logText('Attempting to reconnect to CC...'); })
  .on('reconnect_failed', function() { gs.logText('Reconnection to CC failed', 'ERR'); })
  .on('error', function(err) { gs.logText('Socket Error: ' + err, 'ERR'); })

  // handle authentication socket events
  .on('auth-challenge', function(challenge) {
    var response = crypto
      .createHmac(challenge.alg, app.config.key)
      .update(challenge.data)
      .digest(challenge.enc);
    socket.emit('auth-response', response);
  })
  .on('auth-pass', function() {
    gs.logText('from CC', 'AUTH PASS', utils.colors.ok);
    event.on('serialRead',gs.handleSerialRead);
    if(Object.getOwnPropertyNames(app.db).length == 0) {
      socket.emit('dbsync',function(dbitems) {
        utils.log(utils.colors.info + 'INF' + utils.colors.reset + ' DB sync with CC');
        logText('DB Sync with CC', 'INF', app.utils.colors.ok);
        app.db = dbitems;
      });
    }
  })
  .on('auth-fail', function() {
    gs.logText('from CC', 'AUTH FAIL', utils.colors.error);
  })
  
  // handle application socket events
  .on('relay', function(data) {
    gs.handleSerialRead(data);
    gs.logText('from CC', 'RLY', utils.colors.warn);
  })
  .on('info', function(packet){
    gs.logPacket(packet, 'INF', 'from CC');
  })
  .on('cap', function(packet){
    //handleCAP(packet.p, 'CAP');
  })

  socket.socket.connect(); // trust me, this is correct
  //   ----------------   End Socket Setup   ----------------
  
  return socket;
}