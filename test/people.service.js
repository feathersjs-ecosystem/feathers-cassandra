const createService = require('../src')
const createModel = require('./people.model')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    events: ['testing']
  }

  app.use('/people', createService(options))
}
