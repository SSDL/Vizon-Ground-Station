var utils = exports;

utils.colors = {
  low: '\033[2m',
  error : '\033[31m',
  info: '\033[36m',
  ok: '\033[32m',
  warn: '\033[33m',
  reset: '\033[0m'
}
  
utils.napcolors = {
  INF: utils.colors.info,
  TAP: utils.colors.warn,
  CAP: utils.colors.warn,
  ERR: utils.colors.error
}

utils.log = function(str,data) {
  var config = require('./config.js');
  if(config.dev && data) console.log();
  console.log(utils.colors.low + (new Date()).toISOString() + ' - ' + utils.colors.reset + str);
  if(config.dev && data) {
    console.log(data);
    console.log();
  }
}

utils.logText = function(text, TYPE, color) {
  if(!TYPE) TYPE = 'INF';
  if(!color) color = utils.napcolors[TYPE] || utils.colors.info;
  utils.log(color + TYPE + utils.colors.reset + ' ' + text);
}

utils.logPacket = function(packet, TYPE, text, hash) {
  if(!hash) hash = crypto.createHash('sha1').update(JSON.stringify(packet)).digest('hex');
  utils.log((utils.napcolors[TYPE] ? utils.napcolors[TYPE] : '') + TYPE + utils.colors.reset + ' ' + hash.substring(0,6) + ' ' + text, packet);
}