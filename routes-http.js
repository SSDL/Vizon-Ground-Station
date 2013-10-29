module.exports = function(app){
  
  app.get('/', function (req, res) {
    res.render('root.jade');
  });
  
  app.get('/test',function(req,res) {
    app.db.test('',0,function(err,result){
      res.json(result);
    })
  });
  
  app.post('/php/getTelem.php', function (req, res) {
    var result;
    switch(req.body.method) {
    case 2:   // Gets a single telemetry point using the mission id (mid=) and TAP ID (tapid=) and sequence (seq=).
    case 4:   // Gets an array of telemetry points using an array of [mid,tapid,seq] arrays combined into a string (idArray=).
      break;  // Deprecated because it seems to rely on ssdlgs.php, which references an outdated db "ssdlgsold" 
    case 3:   // Gets an array of telemetry points from a single telemetry table using an array of tids (tid=) and a single telemetry table (table=).
      var tidarray = req.body.tid.split('~');
      for(var tid in tidarray) {
        app.db.getLatestVal(req.body.table,tidarray[tid],function(err,result){
          res.json(result[0]);
        })
      }
      break;
    case 5:   // Gets an array of telemetry points using an array of [table,tid] arrays combined into a string (idArray=).
      var tidarray = req.body.tid.split('~');
      for(var tid in tidarray) {
        var tabletidsplit = tidarray[tid].split("*");
        app.db.getLatestVal(tabletidsplit[0],tabletidsplit[1],function(err,result){
          res.json(result[0]);
        })
      }
      break;
    case 6:   // Gets an array of telemetry points using an array of [mid,tapid,seq] arrays combined into a string (idArray=)
      var tidarray = req.body.tid.split('~');
      for(var tid in tidarray) {
        var tabletidsplit = tidarray[tid].split("*");
        app.db.getLatestValByMidTapSeq(tabletidsplit[0],tabletidsplit[1],tabletidsplit[2],function(err,result){
          res.json(result[0]);
        })
      }
      break;
    case 1:   // Gets a single telemetry point using the telemetry table (table=) and telemetry id (tid=).
    default:  // This was the original code of getTelem.php.  This ensures backwards compatibility.
      app.db.getLatestVal(req.body.table,req.body.tid,function(err,result){
        res.json(result[0]);
      })
    }
  });
  
  app.post('/php/getCmdSeqNum.php', function (req, res) {
    app.db.getCmdSeqNum(req.body.mid,function(err,result){
      res.json(result[0]);
    })
  });
  
  app.post('/php/insertCmd.php', function (req, res) {
    app.db.getTableInfoForMission(req.body.mid,function(err,mission){
      app.db.insertCmd(mission[0].dbname, req.body.cmdtype, req.body.cmdlength, req.body.timeexec, req.body.status, function(err,result){
        res.json(result[0]);
      })
    })
  });
  
  app.post('/php/insertCmdArg.php', function (req, res) {
    app.db.getTableInfoForMission(req.body.mid,function(err,mission){
      app.db.insertCmdArg(mission[0].dbname, req.body.cmdtype, req.body.seq, req.body.arg,function(err,result){
        res.json(result[0]);
      })
    })
  });
}