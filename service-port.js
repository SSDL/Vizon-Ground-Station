module.exports = function(app) {
  var event = app.event
    , com = require("serialport")
    , utils = app.utils
    , gs = app.gs
    , port = {}
    ;


  //   ----------------   Begin Port Setup   ----------------
  var portRetry = setInterval(portRetryFunc, 10000);

  function portRetryFunc() {
    gs.logText('Serial port closed - Retry in 10s...', 'ERR');
    portConnect();
  }

  function portConnect() {
    com.list(function (err, ports) {
      //app.utils.log('List of available ports:');
      ports.forEach(function(testport) {
        //console.log('Port name: ' + testport.comName);
        //console.log('Port pnpid: ' + testport.pnpId);
        //console.log('Port mfgr: ' + testport.manufacturer);
        //console.log();
        if(testport.comName == app.config.port || (testport.pnpId.indexOf(app.config.port.pid) >= 0 && testport.pnpId.indexOf(app.config.port.vid) >= 0)) {
          port = new com.SerialPort(testport.comName, {
            baudrate: 9600,
            parser: com.parsers.raw
          }, false)
          .on('open', function() {
            clearInterval(portRetry);
            port.connected = true;
            event.on('serialWrite',app.gs.handleSerialWrite);
            gs.logText('Serial port ' + testport.comName + ' opened');
          })
          .on('close', function(data) {
            port.connected = false;
            event.removeListener('serialWrite',app.gs.handleSerialWrite);
            portRetry = setInterval(portRetryFunc, 10000);
            gs.logText('Serial port ' + testport.comName + ' closed', 'ERR');
          })
          .on('error', function(data) {
            gs.logText('Serial port ' + testport.comName + ' error: ' + data, 'ERR');
          })
          .on('data', function(buf) {
            event.emit('serialRead',buf);
            gs.logText('Serial data');
          });
          port.open();
        }
      });
    });
  }

  portConnect();
  //   ----------------   End Port Setup   ----------------
  
  return port;
}