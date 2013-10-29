module.exports = function(db){
  
  liason(){
    this.tapqueue = [];
  }

  liason.prototype.add = function(table, TID, timestamp, ms, seqNum, rdata, cdata){
    this.tapqueue.push({
      table: table,
      TID: TID,
      timestamp: timestamp,
      ms: ms,
      seqNum: seqNum,
      rdata:rdata,
      cdata:cdata
    })
  }

  return liason; // new object already
}();