module.exports = function(){
  var fs = require('fs');
  var config = {
  
    production: {
      gsid: '52749a447a7383724b912ec2',
      key: '1234567890abcdef',
      cc: {
        uri: 'https://ssdl-vizon.stanford.edu/gs', // must specify https or a socket hangup will occur
        options: {
          'auto connect': false
        }
      },
      port: {
        name: 'COM13', // '/dev/tty-usbserial1'
        pid: 'PID_F020',
        vid: 'VID_0403',
        baud: 9600
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
        uri: 'http://localhost/gs',
        options: { // can use standard config file or args later
          'auto connect': false
        }
      },
      port: {
        name: 'COM13', // '/dev/tty-usbserial1'
        pid: 'PID_F020',
        vid: 'VID_0403',
        baud: 9600
      },
      ssl: {
        //cert: fs.readFileSync('./ssl/client.crt'),
        //key: fs.readFileSync('./ssl/client.pem'),
        //ca: fs.readFileSync('./ssl/ca.crt')
      }
    }
    
  };
  
  var env = (process.env.NODE_ENV == 'production' ? 'production' : 'development');
  config = config[env]; // select the config property that matches the environment
  config.prod = (env == 'production'); // set boolean flags for convenience
  config.dev = !(config.prod);
  config.env = env;
  return config;
}();