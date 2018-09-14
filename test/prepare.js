const prepare = require('mocha-prepare')
const feathers = require('@feathersjs/feathers')
const sleep = require('await-sleep')
const services = require('./services')

const KEYSPACE = 'test'

let app = null
let people = null
let peopleRooms = null
let peopleRoomsCustomIdSeparator = null
let peopleMv = null

const exec = async (query) => {
  return new Promise((resolve, reject) => {
    query.exec((err, res) => {
      if (err) return reject(err)
      resolve(res)
    })
  })
}

const truncateTables = async cassanknex => {
  await exec(cassanknex(KEYSPACE).truncate('people'))
  await exec(cassanknex(KEYSPACE).truncate('people_customid'))
  await exec(cassanknex(KEYSPACE).truncate('people_rooms'))
  await exec(cassanknex(KEYSPACE).truncate('people_rooms_custom_id_separator'))
  await exec(cassanknex(KEYSPACE).truncate('people_mv'))
  await exec(cassanknex(KEYSPACE).truncate('todos'))
}

prepare(async done => {
  function knex () {
    const app = this

    let cassanknex = null

    const cassandraClient = app.get('cassandraClient')
    cassandraClient.connect(err => {
      if (err) throw err

      cassanknex = require('cassanknex')({
        connection: cassandraClient
      })

      cassanknex.on('ready', async err => {
        if (err) throw err

        return sleep(30000).then(() => {
          return truncateTables(cassanknex)
            .then(() => {
              done()
            })
        })
      })
    })

    app.set('cassanknex', () => cassanknex)
  }

  const ExpressCassandra = require('express-cassandra')
  const models = ExpressCassandra.createClient({
    clientOptions: {
      contactPoints: ['127.0.0.1'],
      protocolOptions: { port: 9042 },
      keyspace: KEYSPACE,
      queryOptions: { consistency: ExpressCassandra.consistencies.one }
    },
    ormOptions: {
      defaultReplicationStrategy: {
        'class': 'SimpleStrategy',
        'replication_factor': 1
      },
      migration: 'alter',
      createKeyspace: true
    }
  })

  const cassandraClient = models.orm.get_system_client()

  app = feathers()
    .set('models', models)
    .set('cassandraClient', cassandraClient)
    .configure(knex)
    .configure(services)

  people = app.service('people')
  peopleRooms = app.service('people-rooms')
  peopleRoomsCustomIdSeparator = app.service('people-rooms-custom-id-separator')
  peopleMv = app.service('people-mv')
})

module.exports = {
  app: () => app,
  cassandraClient: () => app.get('cassandraClient'),
  people: () => people,
  peopleRooms: () => peopleRooms,
  peopleRoomsCustomIdSeparator: () => peopleRoomsCustomIdSeparator,
  peopleMv: () => peopleMv
}
