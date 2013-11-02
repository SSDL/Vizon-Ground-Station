module.exports = function(app){
  var config = {
    production: {
      gsid: '52749a447a7383724b912ec2',
      securekey: '1234567890abcdef',
      cc: {
        uri: 'http://localhost:8080/',
        options: { // can use standard config file or args later
          'auto connect': false,
          'reconnect': true,
          'reconnection limit': 10000
        }
      },
      port: {
        name: 'COM13',
        pid: 'PID_F020',
        vid: 'VID_0403'
      }
    },
    development: {
      gsid: '52749a447a7383724b912ec2',
      securekey: '1234567890abcdef',
      cc: {
        uri: 'http://localhost:8080/',
        options: { // can use standard config file or args later
          'auto connect': false,
          'reconnect': true,
          'reconnection limit': 10000
        }
      },
      port: {
        name: 'COM13',
        pid: 'PID_F020',
        vid: 'VID_0403'
      }
    }
  };
  
  config = config[app.get('env')];
  config.prod = (app.get('env') == 'production');
  config.dev = !(config.prod);
  return config;
}