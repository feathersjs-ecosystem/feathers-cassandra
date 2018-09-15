const createModel = require('./people.model')
const createService = require('../src')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    events: ['testing']
  }

  app.use('/people', createService(options))
}
