const createService = require('../src')
const createModel = require('./adapter-tests-people-custom-id.model')
const hooks = require('./adapter-tests-people-custom-id.hooks')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    whitelist: ['$allowFiltering'],
    events: ['testing']
  }

  app.use('/adapter-tests-people-custom-id', createService(options))

  const service = app.service('adapter-tests-people-custom-id')

  service.hooks(hooks)
}
