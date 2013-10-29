module.exports = function(){
  var express = require("express.io")
    , utils = require('./utils.js')
    , nib = require('nib')
    , stylus = require('stylus')
    , app = express().http().io()
    , dbclass = require('./private/dbinclass.js')
    , config = require('./config.js')[app.get('env')]
    ;
    
  app.event = new (require('events').EventEmitter)
  app.event.log = function(str) {
    console.log((new Date()).toString() + ' - ' + str);
  }
    
  app.appRoot = __dirname;
  app.db = (new dbclass).init(config.db);
  
  if (app.get('env') == 'development') {
   app.use(express.logger('dev'));
  }
  app.use(express.bodyParser());
  app.set('title', 'SSDL Vizon Server');
  app.set('views', app.appRoot + '/private');
  app.engine('jade', require('jade').__express);
  app.use(app.router);
  app.use(stylus.middleware({
    src: app.appRoot + '/private',
    dest: app.appRoot + '/public',
    compile: function(str, path) {
      return stylus(str)
        .define('url', stylus.url({
          paths : [app.appRoot + "/static"],
          limit : 25000
        }))
        .set('filename', path)
        .set('compress', true)
        .use(nib())
        .import('nib')
    }
  }));
  app.use(utils.cachecontrol);
  app.use(express.static(app.appRoot + '/public'));
  app.use(express.static(app.appRoot + '/static'));
  app.use(utils.privateblocking);
  app.use(express.static(app.appRoot + '/private'));

  require('./routes-http.js')(app);
  require('./routes-io.js')(app);

  if (module.parent) {
    return app;
  } else {
    var server = app.listen(process.env.PORT || 8080, function() {
      console.log("Listening on " + server.address().port);
    });
  }
}();