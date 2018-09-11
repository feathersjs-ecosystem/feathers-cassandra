const createModel = require('./people-customid.model')
const createService = require('../src')

module.exports = function () {
  const app = this

  const options = {
    id: 'customid',
    model: createModel(app),
    cassanknex: app.get('cassanknex'),
    events: ['testing']
  }

  app.use('/people-customid', createService(options))
}
