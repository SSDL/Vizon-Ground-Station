module.exports = function() {
  var config = require('./config.js')[app.get('env')];
  var db = (new require('./private/dbinclass.js')).init(config.db);
  var gs = require('./gs5.js')(config.gs,db);
  
  return;
}();