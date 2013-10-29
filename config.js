module.exports = {
  development: {
    db: {
      host: 'localhost',
      user: 'dbuser',
      password: 'dbpass',
      database: 'testdb'
    },
    gs: {
      ip: '171.64.160.129',
      port: 12600
    }
  },
  production: {
    db: {
      host: 'localhost',
      user: 'aa236',
      password: 'vizon2008',
      database: 'ssdlgs'
    },
    gs: {
      host: 'ssdl-pegasus.stanford.edu',
      port: 12600
    }
  },
}