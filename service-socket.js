module.exports = function(app) {
  var event = app.event
    , io = require('socket.io-client')
    , crypto = require('crypto')
    , utils = require('./utils.js')
    , config = require('./config.js')
    , gs = require('./service-groundstation.js')
    , socket = {}
    ;

  //   ----------------   Begin Socket Setup   ----------------
  var socketRetry = setInterval(function() { // this is the only way to loop if not connected
    utils.logText('Control Center unavailable', 'ERR');
    socket.socket.connect();
  }, 10000);

  socket = io.connect(config.cc.uri, config.cc.options)
  // handle standard socket events
  .on('connect', function() {
    clearInterval(socketRetry);
    socket.emit('auth-initiate', config.gsid);
    utils.logText('Connected to CC ' + config.cc.uri.split('://')[1]);
  })
  .on('disconnect', function() {
    utils.logText('Connection to CC closed', 'ERR');
    event.emit('socket-stop');
  })
  //.on('connecting', function() { utils.logText('Connecting to CC...'); })
  //.on('reconnecting', function() { utils.logText('Reconnecting to CC...'); })
  //.on('reconnect', function() { utils.logText('Reconnected to CC'); })
  .on('connect_failed', function() { utils.logText('Connection to CC failed', 'ERR'); })
  .on('reconnect_failed', function() { utils.logText('Reconnection to CC failed', 'ERR'); })
  .on('error', function(err) { utils.logText('Socket ' + (config.dev && err ? err : ''), 'ERR'); })

  // handle authentication socket events
  .on('auth-challenge', function(challenge, callback) {
    var response = crypto
      .createHmac(challenge.alg, config.key)
      .update(challenge.data)
      .digest(challenge.enc);
    callback(response);
  })
  .on('auth-pass', function() {
    event.emit('socket-start', socket);
    utils.logText('from CC', 'AUTH PASS', utils.colors.ok);
  })
  .on('auth-fail', function() {
    utils.logText('from CC', 'AUTH FAIL', utils.colors.error);
  })
  
  // handle application socket events
  .on('relay', function(data) {
    gs.handleSerialRead(data);
    utils.logText('from CC', 'RLY', utils.colors.warn);
  })
  .on('info', function(packet){
    utils.logPacket(packet, 'INF', 'from CC: ' + packet);
  })
  .on('cap', function(packet){
    //gs.handleCAP(packet.p, 'CAP');
  })

  socket.socket.connect(); // trust me, this is correct
  //   ----------------   End Socket Setup   ----------------
  
  return socket;
}