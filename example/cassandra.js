const ExpressCassandra = require('express-cassandra')
const FeathersCassandra = require('../src')

module.exports = function (app) {
  const models = ExpressCassandra.createClient({
    clientOptions: {
      contactPoints: ['127.0.0.1'],
      protocolOptions: { port: 9042 },
      keyspace: 'test',
      queryOptions: { consistency: ExpressCassandra.consistencies.one }
    },
    ormOptions: {
      defaultReplicationStrategy: {
        class: 'SimpleStrategy',
        replication_factor: 1
      },
      migration: 'alter',
      createKeyspace: true
    }
  })

  app.set('models', models)

  const cassandraClient = models.orm.get_system_client()

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
}
