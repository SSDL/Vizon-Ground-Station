console.log('Vizon Groundstation');
var event = new (require('events').EventEmitter);
var com = require("serialport");
//var port = new com.SerialPort("/dev/tty-usbserial1", {baudrate: 57600, parser: com.parsers.raw});
var io = require('socket.io-client');

var serialDataBuffer = []; // this holds all the data we get from the serial port

var startupFailNotice = setTimeout(function() {
  console.log('Connection failed. Server not available.');
}, 10000);

var socket = io.connect('http://localhost:8080', {'reconnect': true, 'reconnection limit': 10000})
.on('connecting', function() {
  console.log('Connecting...');
})
.on('connect', function() {
  clearTimeout(startupFailNotice);
  console.log('Connected to pipeline server');
  socket.emit('message','message from groundstation');
  event.on('serialdata',handleSerialData);
  
})
.on('connect_failed', function() {
  console.log('Connection failed');
})
.on('disconnect', function() {
  console.log('Connection closed');
  event.removeListener('serialdata',handleSerialData);
})
.on('reconnecting', function() {
  console.log('Reconnecting...');
})
.on('reconnect_failed', function() {
  console.log('Reconnect failed');
})
.on('message', function(data){
  console.log('got a message from server: ' + data);
})
.on('RAP', function(data){
  console.log('Got a RAP from the server: ');
  console.log(data);
  event.emit('socketdata',data);
})


com.list(function (err, ports) {
  ports.forEach(function(_port) {
    console.log('Port name: ' + _port.comName);
    console.log('Port pnpid: ' + _port.pnpId);
    console.log('Port mfgr: ' + _port.manufacturer);
  });
});

/*
port.open(function () {
  console.log('Serial port ' + port.comName + ' opened');
  port.on('data', function(data) {
    console.log('Serial port data: ' + data);
  });
  
  port.write("ls\n", function(err, results) {
    console.log('err ' + err);
    console.log('results ' + results);
  });  
});
*/


setInterval(function() {
  var randdata = [];
  for(var i = 0; i < 4; i++) randdata.push(Math.floor(Math.random()*256));
  event.emit('serialdata',randdata);
}, 2000);
setInterval(function() {
  var randdata = [0xAB,0xCD];
  randdata.push(Math.floor(Math.random()*256));
  randdata.unshift(Math.floor(Math.random()*256));
  event.emit('serialdata',randdata);
}, 3000);


function handleSerialData(data) { // This assumes that data is a buffer array of bytes. This will not works for string data.
  console.log('Got serial data: ' + data);
  serialDataBuffer.extend(data); // this will push all elements in data onto serialDataBuffer in place
  for(var i = 1; i < serialDataBuffer.length-1; i++) { // do not begin searching at start of array. we want to splice the array as soon as we find the preamble and return the prior bytes
    if(serialDataBuffer[i] == 0xAB && serialDataBuffer[i+1] == 0xCD) {
      prepareRAPforSocket(serialDataBuffer.splice(0,i)); // cut out everything from the start of the array to the byte before AB
      return;
    }
  }
}


function prepareRAPforSocket(rapbytes) {
  // check preamble bytes
  // compare data length to length byte
  console.log('Preparing RAP from bytes: ' + rapbytes);
  function failFunction(){}
  var carryover;
  var nextFunction;
  var RAP = {};
  var RAPcmds = {
    0: function(_rapbytes,k,_RAP,_RAPcmds,_carryover) { if(_rapbytes[k] != 0xAB) { console.log('RAP dropped; preamble wrong'); RAP.fail = true; nextFunction = failFunction; return } nextFunction = _RAPcmds[1]; },
    1: function(_rapbytes,k,_RAP,_RAPcmds,_carryover) { nextFunction = (_rapbytes[k] == 0xCD ? _RAPcmds[2] : failFunction); },
    2: function(_rapbytes,k,_RAP,_RAPcmds,_carryover) { _RAP.test1 = _rapbytes[k]; nextFunction = _RAPcmds[3]; return {a:6}; },
    3: function(_rapbytes,k,_RAP,_RAPcmds,_carryover) { _RAP.test2 = _carryover.a; nextFunction = _RAPcmds[4]; return {}; },
    4: function(_rapbytes,k,_RAP,_RAPcmds,_carryover) { _RAP.added = _rapbytes[k]; nextFunction = _RAPcmds[5]; return {}; },
    5: function(_rapbytes,k,_RAP,_RAPcmds,_carryover) { _RAP.added += _rapbytes[k]; nextFunction = function(){}; }
  }
  nextFunction = RAPcmds[0];
  for(var k  = 0; k < rapbytes.length; k++) {
    carryover = nextFunction(rapbytes,k,RAP,RAPcmds,carryover);
  }
  if(!RAP.fail) { //if(RAP.currcksmA == RAP.sentcksmA && RAP.currcksmB == RAP.sentcksmB) 
    console.log('Sending RAP to server:');
    console.log(RAP);
    socket.emit('RAP',RAP)
  }
}


function relaySerialToSocket(data) {
  console.log('Serial data emitted to socket');
}

// fastest method, from http://stackoverflow.com/questions/1374126/how-to-append-an-array-to-an-existing-javascript-array/1374131#1374131
Array.prototype.extend = function (arrayIn) {
    arrayIn.forEach(function(elem) { this.push(elem) }, this);    
}
