var mysql = require('mysql');
var db = require('./dbclass.js');
var async = require('async');

function augment( receivingClass, givingClass ) {
  for ( var methodName in givingClass.prototype ) {
    if ( !Object.hasOwnProperty(receivingClass.prototype, methodName) ) {
      receivingClass.prototype[methodName] = givingClass.prototype[methodName];
    }
  }
}

function dbmod() {}

augment(dbmod,db);

dbmod.prototype.test = function(colname,num,parentcallback) {
  // requres multiple statement permission in dbclass.js
  //this.query('SELECT * FROM ?? WHERE ?? = ?; SELECT * FROM ??',['testtable',colname,num,'testtable'],callback);
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT * FROM ??',['testtable'],callback);
    }
  ], function(err, result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  });
}

dbmod.prototype.test2 = function(num1,num2,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('INSERT INTO ?? (col1,col2) VALUES (?,?)',['testtable',num1,num2],callback);
    }
  ], function(err, result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  });
}






//Get latest data from $table matching $tid
dbmod.prototype.getLatestVal = function(table,tid,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT * FROM ?? WHERE tid = ? ORDER BY id DESC LIMIT 1',[table,tid],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


//Find $table and $tid using $mid, $tapid, $seq. Then, get latest data from $table matching $tid
dbmod.prototype.getLatestValByMidTapSeq = function(mid,tapid,seq,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.getTableInfoForMission(mid,callback);
    },
    function(result_mid,callback) {
      if(result_mid.length) {
        _this.getTid(mid,tapid,seq,function(err,result){  // use a modified callback so that we can pass
          callback(err,result_mid[0],result);                    // extra parameters to the waterfall callback
        });
      } else {
        parentcallback(err,{});
      }
    },
    function(result_mid,result_tid,callback) {
      if(result_tid.length) {
        var dbname = result_mid[0].dbname;
        var table = result_mid[0].dataTablePrefix+result_tid[0].TableSuffix;
        var tid = result_tid[0].tid;
		// This ONE line used to bring Vizon to its knees...
    //	$result = parent::queryArray(mysql_real_escape_string("SELECT * FROM $dbname.$table WHERE id = (SELECT MAX(id) FROM $dbname.$table WHERE tid = $tid)"));
        _this.query('SELECT id,tid,CONVERT_TZ(recvtime,??,??) as recvtime,time,ms,seqNum,rawValue,convValue FROM ??.?? WHERE tid=? ORDER BY id DESC LIMIT 1',['SYSTEM','+0:00',dbname,table,tid],callback);
      } else {
        parentcallback(err,{});
      }
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) {
      if(result.length) parentcallback(err,{})
      else parentcallback(err,result);
    }
  })
}


// Update ground station information
dbmod.prototype.updateGroundStation = function(mid,gs_ip,gs_port,gs_name,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT COUNT(*) FROM tblRegisteredGroundStations WHERE mid=?',[mid],callback);
    },
    function(count,callback) {
      if(count) {
        _this.query('UPDATE tblRegisteredGroundStations SET gs_ip=??, gs_port=?, lastUpdated=NOW() where mid=?',[gs_ip,gs_port,mid],callback);
      } else {
        _this.query('INSERT INTO tblRegisteredGroundStations (mid,gs_ip,gs_port) VALUES (?,??,??)',[mid,gs_ip,gs_port],callback);
      }
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// Refresh the timestamp on a given ground station (used when a PipelineByte registers)
dbmod.prototype.refreshGroundStation = function(gs_ip,gs_port,gs_name,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT COUNT(*) FROM tblRegisteredGroundStations WHERE gs_ip=?? AND gs_port=',[gs_ip,gs_port],callback);
    },
    function(count,callback) {
      if(count) {
        _this.query('UPDATE tblRegisteredGroundStations SET lastUpdated=NOW() where gs_ip=??, gs_port=?',[gs_ip,gs_port],callback);
      } else {
        _this.query('INSERT INTO tblRegisteredGroundStations (gs_name,gs_ip,gs_port) VALUES (??,??,??)',[gs_name,gs_ip,gs_port],callback);
      }
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}
 

// Get list of ground stations
// TODO only get ground stations that are "recent"
dbmod.prototype.getGroundStations = function(parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT DISTINCT id,gs_name FROM tblRegisteredGroundStations',[],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// Get the ground station for a given mission
// TODO only get ground stations that are "recent"
dbmod.prototype.getGroundStationByMid = function(mid,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT id FROM tblRegisteredGroundStations WHERE mid=?',[mid],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) {
      if(result.length == 1) parentcallback(err,result);
      else getGroundStations(parentcallback);
    }
  })
}


// Get the ground station by given id
dbmod.prototype.getGroundStationById = function(id,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT id FROM tblRegisteredGroundStations WHERE id=?',[id],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,(result.length == 1 ? result[0] : {}));
  })
}


// Return the database name and tableprefix for a given mission.
dbmod.prototype.getTableInfoForMission = function(mid,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT dbname,dataTablePrefix from tblMission where mid=?',[mid],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// Returns the order, size, number, and table of tid points in a tap
dbmod.prototype.getTids = function(mid,tapid,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT tid,seq,size,convtype,tblTelemetry.name,tblDataTypes.TableSuffix,tblDataTypes.DataType FROM tblTelemetry JOIN tblDataTypes ON tblDataTypes.DataType=tblTelemetry.dataType WHERE tapintid=(SELECT tapintid FROM tblTAP WHERE tapid=? AND ProtocolID=(SELECT ProtocolID FROM tblMission WHERE mid=?)) ORDER BY seq',[tapid,mid],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.getConv = function(convID,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT * FROM tblConvTypes WHERE ConvType=?',[convID],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,(result.length == 1 ? result[0] : {}));
  })
}


// Returns the name of a TAP
dbmod.prototype.getTapName = function(mid,tapid,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT name FROM tblTAP WHERE tapid=? AND ProtocolID=(SELECT ProtocolID FROM tblMission WHERE mid=?)',[tapid,mid],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.getTid = function(mid,tapid,seq,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT tid,tblTelemetry.name,tblDataTypes.TableSuffix FROM tblTelemetry JOIN tblDataTypes ON tblDataTypes.DataType=tblTelemetry.dataType WHERE tapintid=(SELECT tapintid FROM tblTAP WHERE tapid=? AND ProtocolID=(SELECT ProtocolID FROM tblMission WHERE mid=?)) AND seq=?',[tapid,mid,seq],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.getTidInfo = function(tid,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT tid,tblTelemetry.name,tblDataTypes.TableSuffix FROM tblTelemetry JOIN tblDataTypes ON tblDataTypes.DataType=tblTelemetry.dataType WHERE tid=?)',[tid],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.getTidListFromMid = function(mid,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('SELECT tid,tblTelemetry.name, tblProtocols.name AS pname, tblMission.mid FROM tblTelemetry LEFT JOIN tblTAP ON tblTAP.tapintid=tblTelemetry.tapintid LEFT JOIN tblProtocols on tblTAP.ProtocolID=tblProtocols.ProtocolID LEFT JOIN tblMission on tblMission.ProtocolID=tblProtocols.ProtocolID WHERE tblMission.mid=? ORDER BY tblTelemetry.tapintid, tblTelemetry.name',[mid],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}




// 
dbmod.prototype.insertraw = function(table,tid,timestamp,ms,sequenceNumber,rdata,cdata,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      //$convdata = $dataconverter($tid,$data);
      var q = 'INSERT INTO ?? VALUES (NULL,?,NULL,?,?,?';
      var e = [table,tid,timestamp,ms,sequenceNumber];
      // Now should only have count $rdata and $cdata of one
      if ((cdata.length == 1) && (rdata.length == 1)) {
        q += ',?,?';
        e.push(rdata,cdata);
      } else {
        console.log('Vector data to multiple columns no longer support. Please check your GS and Vizon DB revisions.');
      }
      q += ')';
      _this.query(q,e,callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.insertCmd = function(table, seqNum, cmdtype, cmdlength, timeexec, chksum1, chksum2, status,parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('INSERT INTO ?? VALUES (NULL,NULL,?,?,?,?,?,?,?)',[table,seqNum,cmdtype,cmdlength,timeexec,chksum1,chksum2,status],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.insertCmdArg = function(tableCmds, table, cmdtype, seq, arg, parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.query('INSERT INTO ?? VALUES (NULL,(SELECT cid FROM ?? WHERE cmdtype=? ORDER BY cid DESC LIMIT 1),?,?)',[table,tableCmds,cmdtype,seq,arg],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.getCmds = function(mid, time, status, parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.getTableInfoForMission(mid,callback);
    },
    function(result_mid,callback) {
      var dbname = result_mid[0].dbname;
      _this.query('SELECT * FROM ?.tblCommands LEFT JOIN ?.tblCmdArgs ON ?.tblCommands.cid = ?.tblCmdArgs.cid WHERE exectime>? AND status=? ORDER BY exectime ASC LIMIT 30',[dbname,dbname,dbname,dbname,time,status],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.getLatestCmd = function(mid, status, parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.getTableInfoForMission(mid,callback);
    },
    function(result_mid,callback) {
      var dbname = result_mid[0].dbname;
      _this.query('SELECT COUNT(*) as count FROM ?.tblCmdArgs WHERE cid=(SELECT cid FROM ?.tblCommands WHERE status=? ORDER BY timesent DESC LIMIT 1)',[dbname,dbname,status],callback);
    },
    function(result_count,callback) {
      var argcount = result_mid[0].count;
      _this.query('SELECT * FROM ?.tblCommands LEFT JOIN ?.tblCmdArgs ON ?.tblCommands.cid=?.tblCmdArgs.cid WHERE status=? ORDER BY timesent DESC LIMIT ?',[dbname,dbname,dbname,dbname,status,argcount],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.getLatestCmdExec = function(mid, time, parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.getTableInfoForMission(mid,callback);
    },
    function(result_mid,callback) {
      var dbname = result_mid[0].dbname;
      _this.query('SELECT COUNT(*) as count FROM ?.tblCmdArgs WHERE cid=(SELECT cid FROM ?.tblCommands WHERE exectime < ? ORDER BY timesent DESC LIMIT 1)',[dbname,dbname,time],callback);
    },
    function(result_count,callback) {
      var argcount = result_mid[0].count;
      _this.query('SELECT * FROM ?.tblCommands LEFT JOIN ?.tblCmdArgs ON ?.tblCommands.cid=?.tblCmdArgs.cid WHERE exectime < ? AND status = ? ORDER BY timesent DESC LIMIT ?',[dbname,dbname,dbname,dbname,time,0,argcount],callback);
		//return parent::queryArray("SELECT * FROM $dbname.tblCommands WHERE exectime < $time AND status = '0' ORDER BY exectime DESC LIMIT 1");
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.getCmdSeqNum = function(mid, parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.getTableInfoForMission(mid,callback);
    },
    function(result_mid,callback) {
      var dbname = result_mid[0].dbname;
      _this.query('SELECT seqNum FROM ?.tblCommands ORDER BY timesent DESC LIMIT 1',[dbname],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}


// 
dbmod.prototype.chgCmdStatus = function(initstatus, finalstat, exectime, seqNum, chksum1, chksum2, parentcallback) {
}


// 
dbmod.prototype.clrCmdQ = function(mid, parentcallback) {
  var _this = this;
  async.waterfall([
    function(callback) {
      _this.getTableInfoForMission(mid,callback);
    },
    function(result_mid,callback) {
      var dbname = result_mid[0].dbname;
      _this.query('UPDATE ?.tblCommands SET status=? WHERE status=?',[dbname,1,0],callback);
    }
  ], function(err,result) {
    if(err) throw err;
    if(parentcallback) parentcallback(err,result);
  })
}



module.exports = dbmod;
