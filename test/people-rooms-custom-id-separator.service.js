const createModel = require('./people-rooms-custom-id-separator.model')
const createService = require('../src')

module.exports = function () {
  const app = this

  const options = {
    idSeparator: '.',
    model: createModel(app),
    events: ['testing']
  }

  app.use('/people-rooms-custom-id-separator', createService(options))
}
