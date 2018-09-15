const feathers = require('@feathersjs/feathers')
const express = require('@feathersjs/express')
const rest = require('@feathersjs/express/rest')
const errorHandler = require('@feathersjs/express/errors');
const bodyParser = require('body-parser')
const cassandra = require('./cassandra')
const services = require('./services')

// Create a feathers instance.
const app = express(feathers())
  // Enable REST services
  .configure(rest())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({ extended: true }))

app.configure(cassandra)
app.configure(services)

// Handle Errors
app.use(errorHandler())

// Start the server
module.exports = app.listen(3030)

console.log('Feathers Todo FeathersCassandra service running on 127.0.0.1:3030')
