module.exports = function(app) {
  var event = app.event
    , gs = require('./service-groundstation.js')
    , utils = require('./utils.js')
    , endpoints = {}
    ;
  
  event.on('port-start', function(_port){                       // When the port connects, enable the serial port writer
    endpoints.port = _port;
    event.on('port-write',handlePortWrite);
  });
  event.on('port-stop', function(){                             // When the port disconnects, disable the serial port writer
    event.removeListener('port-write',handlePortWrite);
  });
  event.on('socket-start', function(_socket){                   // When the socket connects, enable the port reader and socket sender
    endpoints.socket = _socket;
    event.on('port-read',gs.handleSerialRead);
    event.on('socket-send', handleSocketSend);
  });
  event.on('socket-stop', function(){                           // When the socket disconnects, disable the port reader and socket sender
    event.removeListener('port-read',gs.handleSerialRead);
    event.removeListener('socket-send',handleSocketSend);
  });
  
  function handleSocketSend(packetType, data, callback){
    if(callback)
      endpoints.socket.emit(packetType, data, callback);
    else if(data)
      endpoints.socket.emit(packetType, data);
  }
  
  function handlePortWrite(data){
    endpoints.port.write(data, function(err, results) {
      if(err) utils.log('Serial write error: ' + err);
      if(results != 0) utils.logText('Serial data write - ' + results + ' bytes');
    });
  }
}