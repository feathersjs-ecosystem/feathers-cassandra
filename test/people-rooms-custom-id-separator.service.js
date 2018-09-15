const createModel = require('./people-rooms-custom-id-separator.model')
const createService = require('../src')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    idSeparator: '.',
    events: ['testing']
  }

  app.use('/people-rooms-custom-id-separator', createService(options))
}
