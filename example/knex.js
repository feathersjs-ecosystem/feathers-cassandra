module.exports = function () {
  const app = this;

  let cassanknex = null;

  const cassandraClient = app.get('cassandraClient')
  cassandraClient.connect(err => {
    if (err) throw err

    cassanknex = require('cassanknex')({
      connection: cassandraClient
    })

    cassanknex.on('ready', err => {
      if (err) throw err
    })
  })

  app.set('cassanknex', () => cassanknex)
};
