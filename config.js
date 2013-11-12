module.exports = function(app){
  var fs = require('fs');
  var config = {
  
    production: {
      gsid: '52749a447a7383724b912ec2',
      key: '1234567890abcdef',
      cc: {
        uri: 'https://ssdl-vizon.stanford.edu/gs', // must specify https or a socket hangup will occur
        options: {
          'auto connect': false,
          secure: true
        }
      },
      port: {
        name: 'COM13', // '/dev/tty-usbserial1'
        pid: 'PID_F020',
        vid: 'VID_0403'
      },
      ssl: {
        //cert: fs.readFileSync('./ssl/client.crt'),
        //key: fs.readFileSync('./ssl/client.pem'),
        //ca: fs.readFileSync('./ssl/ca.crt')
      }
    },
    
    development: {
      gsid: '52749a447a7383724b912ec2',
      key: '1234567890abcdef',
      cc: {
        uri: 'localhost/gs',
        options: { // can use standard config file or args later
          'auto connect': false,
          secure: false
        }
      },
      port: {
        name: 'COM13', // '/dev/tty-usbserial1'
        pid: 'PID_F020',
        vid: 'VID_0403'
      },
      ssl: {
        //cert: fs.readFileSync('./ssl/client.crt'),
        //key: fs.readFileSync('./ssl/client.pem'),
        //ca: fs.readFileSync('./ssl/ca.crt')
      }
    }
    
  };
  
  config = config[process.env.NODE_ENV];
  config.prod = (process.env.NODE_ENV == 'production');
  config.dev = !(config.prod);
  config.env = (config.prod ? 'production' : 'development');
  return config;
}