const createModel = require('./people.model')
const createService = require('../src')

module.exports = function () {
  const app = this

  const options = {
    id: 'id',
    model: createModel(app),
    cassanknex: app.get('cassanknex'),
    events: ['testing']
  }

  app.use('/people', createService(options))
}
