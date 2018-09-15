const createModel = require('./people-customid.model')
const createService = require('../src')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    events: ['testing']
  }

  app.use('/people-customid', createService(options))
}
