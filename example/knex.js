const FeathersCassandra = require('../src')

module.exports = function (app) {
  const cassandraClient = app.get('models').orm.get_system_client()

  cassandraClient.connect(err => {
    if (err) throw err

    const cassanknex = require('cassanknex')({
      connection: cassandraClient
    })

    FeathersCassandra.cassanknex(cassanknex)

    cassanknex.on('ready', err => {
      if (err) throw err
    })
  })
};
