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
    , db = app.db = {empty: true} // database items to request from server
    , serialReadBuffer = app.serialReadBuffer = []

  // tools and utilities
    , make_rapobject = require('./make_rapobject.js')(app)
    , make_rapbytes = require('./make_rapbytes.js')(app)
    , utils = app.utils = require('./utils.js')(app)
    ;

  utils.log('Vizon Ground Station starting on ' + os.hostname());
  utils.log(config.cc.uri);
  console.log();


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
          port = new com.SerialPort(_port.comName, {
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
            event.emit('serialRead',buf);
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

  socket = io.connect(app.config.cc.uri, app.config.cc.options)
  // handle standard socket events
  .on('connect', function() {
    clearInterval(socketRetry);
    utils.log('Connected to Control Center');
    socket.emit('msg','Sup yall');
    event.on('serialRead',handleSerialRead);
    if(db.empty) {
      socket.once('dbsync',function(dbitems) {
        db = dbitems;
      });
      socket.emit('dbsync');
    }
  })
  .on('disconnect', function() {
    utils.log('Connection to Control Center closed');
    event.removeListener('serialRead',handleSerialRead);
  })
  .on('connecting', function() { utils.log('Connecting to Control Center...'); })
  .on('connect_failed', function() { utils.log('Connection to Control Center failed'); })
  .on('reconnecting', function() { utils.log('Attempting to reconnect to Control Center...'); })
  .on('reconnect_failed', function() { utils.log('Reconnect to Control Center failed'); })

  // handle custom socket events
  .on('msg', function(data){ utils.log('Control Center message: ' + data); })
  .on('NAP', function(nap){
    authenticateNAP(nap, function(_nap, verified){
      utils.log('NAP from Control Center' + ( verified ? ' verified' : ' failed verification'));
      if(verified) {
        switch(nap.header.typeid) {
        case db.enums.naptype.INFO:
          utils.log('INFO: ' + nap.payload)
          break;
        case db.enums.naptype.TAP:
          utils.log('NAP not processed: Ground Station does not handle TAPs');
          break;
        case db.enums.naptype.CAP:
          handleSocketRAP(nap.payload);
          break;
        case db.enums.naptype.CMD:
          break;
        default:
          utils.log('NAP not processed: unknown typeid');
        }
      }
    });
  });

  socket.socket.connect(); // trust me, this is correct
  //   ----------------   End Socket Setup   ----------------



  utils.randomSerialData(); // Generate random serial data for testing
  

  function handleSerialRead(newdata) { // newdata can be either Buffer or Array. The extendArray function can handle either.
    extendArray(serialReadBuffer,newdata); // Push all buffer elements onto serialReadBuffer in place.
    for(var i = 1; i < serialReadBuffer.length-1; i++) { // Search for /next/ sync, marking end of rap
      if(serialReadBuffer[i] == 0xAB && serialReadBuffer[i+1] == 0xCD) { // found end of rap
        make_rapobject.process(serialReadBuffer.splice(0,i),function(rap) { // splice out the complete rap
          var nap = {
            header: {
              typeid: db.enums.naptype.TAP,
              gsid: app.config.gsid,
              mid: rap.to
            },
            payload: rap.tap
          }
          sendNAP(nap);
        });
        return; // stop searching for sync
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


  // this is completely wrong now
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
  
  function sendNAP(nap, callback) {
    signNAP(nap, function(_nap){
      socket.emit('NAP',nap);
      utils.log('NAP transmitted to Control Station', nap);
      if(callback) callback(nap);
    });
  }
  
  
  function signNAP(nap, callback) {
    nap.signature = {
      alg: 'sha1',
      enc: 'base64'
    };
    nap.signature.hmac = crypto.createHmac(nap.signature.alg, app.config.securekey)
      .update(JSON.stringify(nap.header) + JSON.stringify(nap.payload))
      .digest(nap.signature.enc);
    if(callback) callback(nap);
  }
  
  
  function authenticateNAP(nap, callback) {
    var hmac = crypto.createHmac(nap.signature.alg, app.config.securekey)
      .update(JSON.stringify(nap.header) + JSON.stringify(nap.payload))
      .digest(nap.signature.enc);
    if(callback) callback(nap, nap.signature.hmac == hmac);
  }

}();