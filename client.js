module.exports = function(){
  var os = require("os")
    , express = require('express')
    , app = express()
    , com = require("serialport")
    , io = require('socket.io-client')
    , crypto = require('crypto')
    , event = app.event = new (require('events').EventEmitter)
    , config = app.config = require('./config.js')(app)

    // placeholder objects. thse must exist here so that function callbacks can reference them
    , port = app.port = {}
    , socket = app.socket = {}
    , serialReadBuffer = []

  // tools and utilities
    , make_rapobject = require('./make_rapobject.js')(app)
    , make_rapbytes = require('./make_rapbytes.js')(app)
    , utils = app.utils = require('./utils.js')(app)
    ;

  utils.log('Vizon Groundstation starting on ' + os.hostname());


  //   ----------------   Begin Port Setup   ----------------
  var portRetry = setInterval(portRetryFunc, 10000);

  function portRetryFunc() {
    utils.log('Serial port not found - Retry every 10 seconds...');
    portConnect();
  }

  function portConnect() {
    com.list(function (err, ports) {
      //utils.log('List of available ports:');
      ports.forEach(function(_port) {
        if(_port.comName== app.config.port || (_port.pnpId.indexOf() >= 0 && _port.pnpId.indexOf(app.config.port.vid) >= 0)) {
          port = new com.SerialPort(_port.comName, { // '/dev/tty-usbserial1'
            baudrate: 9600,
            parser: com.parsers.raw
          }, false)
          .on('open', function() {
            clearInterval(portRetry);
            port.connected = true;
            utils.log('Serial port ' + port.comName + ' opened');
            event.on('serialWrite',handleSerialWrite);
          })
          .on('close', function(data) {
            port.connected = false;
            event.removeListener('serialWrite',handleSerialWrite);
          })
          .on('error', function(data) {
            port.connected = false;
            portRetry = setInterval(portRetryFunc, 10000);
            event.removeListener('serialWrite',handleSerialWrite);
          })
          .on('data', function(buf) {
            utils.log('Serial data',buf);
            var data = [];
            for(var i = 0; i < buf.length; i++) data.push(buf[i]);
            event.emit('serialRead',data);
          });
          port.open();
        }
        //console.log('Port name: ' + _port.comName);
        //console.log('Port pnpid: ' + _port.pnpId);
        //console.log('Port mfgr: ' + _port.manufacturer);
      });
      //console.log(' '); // provide newline after list
    });
  }

  portConnect();
  //   ----------------   End Port Setup   ----------------



  //   ----------------   Begin Socket Setup   ----------------
  var socketRetry = setInterval(function() { // this is the only way to loop if not connected
    utils.log('Server connection failed - Retry every 10 seconds...');
    socket.socket.connect();
  }, 10000);

  socket = io.connect(app.config.ctrl.uri, app.config.ctrl.options)
  // handle standard socket events
  .on('connect', function() {
    clearInterval(socketRetry);
    utils.log('Connected to server');
    socket.emit('message','Sup yall');
    event.on('serialRead',handleSerialRead);
  })
  .on('disconnect', function() {
    utils.log('Connection closed');
    event.removeListener('serialRead',handleSerialRead);
  })
  .on('connecting', function() { utils.log('Connecting to Control Center'); })
  .on('connect_failed', function() { utils.log('Connection failed'); })
  .on('reconnecting', function() { utils.log('Attempting to reconnect...'); })
  .on('reconnect_failed', function() { utils.log('Reconnect failed'); })

  // handle custom socket events
  .on('message', function(data){ utils.log('Control Center message: ' + data); })
  .on('NAP:INFO', function(data){
    utils.log('Control Center INFO: ' + data)
  })
  .on('NAP:RAP', function(nap){
    handleSocketRAP(nap.rap);
  });

  socket.socket.connect(); // trust me, this is correct
  //   ----------------   End Socket Setup   ----------------



  utils.randomSerialData(); // Generate random serial data for testing
  
  

  function handleSerialRead(data) { // Assumes data is buffer array of bytes.
    serialReadBuffer.extend(data); // Push all elements in data onto serialReadBuffer in place
    for(var i = 1; i < serialReadBuffer.length-1; i++) { // Do not search at start of array. 
      if(serialReadBuffer[i] == 0xAB && serialReadBuffer[i+1] == 0xCD) { // found sync
        make_rapobject.process(serialReadBuffer.splice(0,i),function(rap) {
          var nap = {
            gsid: app.config.gsid,
            mid: 314, //rap.tap.mid,
            payload: {
              tap: rap.tap
            }
          }
          if(app.config.securekey) signNAP(nap);
          socket.emit('NAP:TAP',nap);
          utils.log('NAP:TAP transmitted to server', nap);
        });
        return;
      }
    }
  }
  
  
  function handleSerialWrite(data) { // Assumes data is buffer array of bytes.
    return; // do not write to serial. not ready for primetime
    port.write(data, function(err, results) {
      if(err) utils.log('err ' + err);
      if(results != 0) utils.log('results ' + results);
    });
  }



  function handleSocketRAP(RAP) { // This receives a JSON object
    utils.log('RAP from server: ',RAP);
    if(port.connected) {
      make_rapbytes.process(RAP,function(rapbytes) {
          handleSerialWrite(rapbytes);
          utils.log('Ready to write rapbytes to serial', rapbytes);
        });
    } else {
      utils.log('RAP not processed - serial port closed');
    }
  }
  
  
  function signNAP(NAP) {
    NAP.signature = {
      alg: 'sha1',
      enc: 'base64'
    };
    NAP.signature.hmac = crypto.createHmac(NAP.signature.alg, app.config.securekey)
      .update(JSON.stringify(NAP.payload))
      .digest(NAP.signature.enc);
  }
  
  
  function verifyNAP(NAP) {
    var hmac = crypto.createHmac(NAP.signature.alg, app.config.securekey)
      .update(JSON.stringify(NAP.payload))
      .digest(NAP.signature.enc);
    return (NAP.signature.hmac == hmac)
  }

}();