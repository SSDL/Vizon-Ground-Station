module.exports = function(app) {
  var event = app.event
    , com = require("serialport")
    , port = {}
    ;


  //   ----------------   Begin Port Setup   ----------------
  var portRetry = setInterval(portRetryFunc, 10000);

  function portRetryFunc() {
    app.utils.log(app.utils.colors.error + 'ERR' + app.utils.colors.reset + ' serial port closed - Retry in 10s...');
    portConnect();
  }

  function portConnect() {
    com.list(function (err, ports) {
      //app.utils.log('List of available ports:');
      ports.forEach(function(_port) {
        if(_port.comName == app.config.port || (_port.pnpId.indexOf(app.config.port.pid) >= 0 && _port.pnpId.indexOf(app.config.port.vid) >= 0)) {
          port = new com.SerialPort(_port.comName, {
            baudrate: 9600,
            parser: com.parsers.raw
          }, false)
          .on('open', function() {
            clearInterval(portRetry);
            port.connected = true;
            event.on('serialWrite',app.gs.handleSerialWrite);
            app.utils.log(app.utils.colors.info + 'INF' + app.utils.colors.reset + ' Serial port ' + _port.comName + ' opened');
          })
          .on('close', function(data) {
            port.connected = false;
            event.removeListener('serialWrite',app.gs.handleSerialWrite);
            portRetry = setInterval(portRetryFunc, 10000);
            app.utils.log(app.utils.colors.error + 'ERR' + app.utils.colors.reset + ' Serial port ' + _port.comName + ' closed');
          })
          .on('error', function(data) {
            app.utils.log(app.utils.colors.error + 'ERR' + app.utils.colors.reset + ' Serial port ' + _port.comName + ' error: ' + data);
          })
          .on('data', function(buf) {
            event.emit('serialRead',buf);
            app.utils.log(app.utils.colors.info + 'INF' + app.utils.colors.reset + ' Serial data',buf);
          });
          port.open();
        }
        //console.log('Port name: ' + _port.comName);
        //console.log('Port pnpid: ' + _port.pnpId);
        //console.log('Port mfgr: ' + _port.manufacturer);
        //console.log();
      });
    });
  }

  portConnect();
  //   ----------------   End Port Setup   ----------------
  
  return port;
}