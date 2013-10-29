var mysql = require('mysql');

function db() {}

db.prototype.init = function(dbconfig) {
  if(dbconfig) this.dbconfig = dbconfig;
  //this.config.multipleStatements = true;
  this.pool = mysql.createPool(this.dbconfig);
  return this;
};

db.prototype.mixin = function(destObject) {
  for (var k in db.prototype) {
    if (db.prototype.hasOwnProperty(k)) {
      destObject.prototype[k] = db.prototype[k];
    }
  }
}

db.prototype.query = function(sql,inserts,callback) {
  this.pool.query(sql,inserts, function(err, results){
    if(callback) callback(err, results);
  });
};

db.prototype.switchDatabase = function(dbname,callback) {
  var _this= this;
  this.pool.end(function(err){
    _this.config.database = dbname;
    _this.init();
  });
  this.query('USE ??',[dbname],callback);
};
 
module.exports = db;
