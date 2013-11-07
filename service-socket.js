module.exports = function(app) {
  var event = app.event
    , io = require('socket.io-client')
    ;

  //   ----------------   Begin Socket Setup   ----------------
  var socketRetry = setInterval(function() { // this is the only way to loop if not connected
    app.utils.log(app.utils.colors.error + 'ERR' + app.utils.colors.reset + ' server connection failed - Retry in 10s...');
    socket.socket.connect();
  }, 10000);

  socket = io.connect(app.config.cc.uri, app.config.cc.options)
  // handle standard socket events
  .on('connect', function() {
    clearInterval(socketRetry);
    event.on('serialRead',app.gs.handleSerialRead);
    if(Object.getOwnPropertyNames(app.db).length == 0) socket.emit('dbsync',function(dbitems) {
      app.utils.log(app.utils.colors.info + 'INF' + app.utils.colors.reset + ' DB sync with Control Center');
      app.db = dbitems;
    });
    app.utils.log(app.utils.colors.info + 'INF' + app.utils.colors.reset + ' Connected to Control Center');
  })
  .on('disconnect', function() {
    app.utils.log('Connection to Control Center closed');
    event.removeListener('serialRead',app.gs.handleSerialRead);
  })
  .on('connecting', function() { app.utils.log(app.utils.colors.info + 'INF' + app.utils.colors.reset + ' Connecting to Control Center...'); })
  .on('connect_failed', function() { app.utils.log(app.utils.colors.info + 'INF' + app.utils.colors.reset + ' Connection to Control Center failed'); })
  .on('reconnecting', function() { app.utils.log(app.utils.colors.info + 'INF' + app.utils.colors.reset + ' Attempting to reconnect to Control Center...'); })
  //.on('reconnect', function() { app.utils.log(app.utils.colors.info + 'INF' + app.utils.colors.reset + ' Reconnected to Control Center'); })
  .on('reconnect_failed', function() { app.utils.log(app.utils.colors.error + 'ERR' + app.utils.colors.reset + ' Reconnection to Control Center failed'); })
  .on('error', function(err) { app.utils.log(app.utils.colors.error + 'ERR' + app.utils.colors.reset + ' Socket Error: ' + err); })

  // handle custom socket events
  .on('msg', function(data){ app.utils.log(app.utils.colors.warn + 'MSG' + app.utils.colors.reset + ' from Control Center: ' + data); })
  .on('NAP', function(nap){
    app.gs.authenticateNAP(nap, function(_nap, verified){
      app.gs.logNAP(nap, (verified ? app.utils.colors.ok + 'accepted' : app.utils.colors.warn + 'rejected') + app.utils.colors.reset + ' from Control Center');
      if(verified) {
        switch(nap.p.h.t.split('_')[0]) {
        case 'INF':
          app.gs.logNAP(nap)
          break;
        case 'TAP':
          app.gs.logNAP(nap, 'ignored: TAP');
          break;
        case 'CAP':
          //handleCAP(nap.p);
          break;
        case 'CMD':
          app.gs.logNAP(nap)
          app.gs.handleCMD(nap);
          break;
        default:
          app.gs.logNAP(nap, 'ignored: unknown');
        }
      }
    });
  });

  socket.socket.connect(); // trust me, this is correct
  //   ----------------   End Socket Setup   ----------------
  
  return socket;
}