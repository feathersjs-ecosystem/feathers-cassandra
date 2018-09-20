const createService = require('../src')
const createModel = require('./people-rooms.model')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    events: ['testing']
  }

  app.use('/people-rooms', createService(options))
}
