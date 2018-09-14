const feathers = require('@feathersjs/feathers')
const express = require('@feathersjs/express')
const rest = require('@feathersjs/express/rest')
const bodyParser = require('body-parser')
const knex = require('./knex')
const services = require('./services')

const ExpressCassandra = require('express-cassandra')
const models = ExpressCassandra.createClient({
  clientOptions: {
    contactPoints: ['127.0.0.1'],
    protocolOptions: {port: 9042},
    keyspace: 'test',
    queryOptions: {consistency: ExpressCassandra.consistencies.one}
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

// Create a feathers instance.
const app = express(feathers())
// Enable REST services
  .configure(rest())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({extended: true}))

app.set('models', models)
app.configure(knex)
app.configure(services)

// Start the server
module.exports = app.listen(3030)

console.log('Feathers Todo FeathersCassandra service running on 127.0.0.1:3030')
