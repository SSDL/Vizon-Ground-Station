module.exports = {
  cachecontrol: function(req, res, next){
    if (req.path.match(/\.(js|css|png)$/)) {
      var age = 60;
      res.setHeader("Cache-Control", "public, max-age="+age);
      res.setHeader("Expires", new Date(Date.now() + age*1000).toUTCString());
    }
    next();
  },
  privateblocking: function(req, res, next){
    if (req.path.match(/\.(coffee|styl)$/)) res.send(404);
    else if (req.path.match(/\.(jade)$/)) res.render(req.path.substr(1));
    else next();
  }
};