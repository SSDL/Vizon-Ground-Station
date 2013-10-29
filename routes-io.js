module.exports = function(app){

  app.io.route('test', function(req) {
    app.event.log(JSON.stringify(req.data));
    req.io.emit('event',req.data);
  });
  
  app.io.route('*', function(req) {
    app.event.log('Unhandled Socket Request');
    event.emit('any','Unhandled Socket Request');
  });

  app.event.on('any', function(source){
    app.event.log('any - ' + source);
  });
}