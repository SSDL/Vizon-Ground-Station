console.log('Vizon Groundstation');
var event = new (require('events').EventEmitter);
//var com = require("serialport");
//var port = new com.SerialPort("/dev/tty-usbserial1", {baudrate: 57600, parser: serialport.parsers.raw}); //parser: com.parsers.readline('\r\n')

var io = require('socket.io-client');
var socket = io.connect('http://localhost:8080', {'reconnect': true, 'reconnection limit': 10000})
.on('connecting', function() {
  console.log('Connecting...');
})
.on('connect', function() {
  console.log('Connected to pipeline server');
  socket.emit('test',{data: 'test data', info: true});
  
})
.on('connect_failed', function() {
  console.log('Connection failed');
})
.on('disconnect', function() {
  console.log('Connection closed');
})
.on('reconnecting', function() {
  console.log('Reconnecting...');
})
.on('reconnect_failed', function() {
  console.log('Reconnect failed');
})
.on('event', function(data){
  console.log(data);
})



com.list(function (err, ports) {
  ports.forEach(function(port) {
    console.log(port.comName);
    console.log(port.pnpId);
    console.log(port.manufacturer);
  });
});

port.open(function () {
  console.log('open');
  port.on('data', function(data) {
    console.log('data received: ' + data);
  });
  port.write("ls\n", function(err, results) {
    console.log('err ' + err);
    console.log('results ' + results);
  });  
});
/**/


function relaySocketToSerial(data) {
  
}
function relaySerialToSocket(data) {
  
}