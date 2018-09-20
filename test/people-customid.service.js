const createService = require('../src')
const createModel = require('./people-customid.model')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    events: ['testing']
  }

  app.use('/people-customid', createService(options))
}
