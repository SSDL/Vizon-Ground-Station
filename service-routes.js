module.exports = function(app){
  
  app.get('/', function (req, res) {
    res.send('ready');
  });
  
  app.get('/raw/:data',function(req,res) {
    app.gs.rapToNAP(req.params.data.split(','), function(rap) { // splice out the complete rap
      var nap = app.gs.createNAP();
      nap.p = rap.tap;
      res.send(nap);
      app.gs.sendNAP(nap);
    });
  });
  
  app.get('/tap/:data',function(req,res) {
    res.send(db.descriptors);
  });
}