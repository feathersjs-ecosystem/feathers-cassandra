const createModel = require('./people-rooms.model')
const createService = require('../src')

module.exports = function () {
  const app = this

  const options = {
    model: createModel(app),
    cassanknex: app.get('cassanknex'),
    events: ['testing']
  }

  app.use('/people-rooms', createService(options))
}
