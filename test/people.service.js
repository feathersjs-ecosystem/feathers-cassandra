const createService = require('../src')
const createModel = require('./people.model')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    multi: ['create', 'patch', 'remove'],
    whitelist: ['$and', '$like', '$token', '$noSelect', '$allowFiltering', '$filters', '$timestamp', '$ttl', '$if', '$ifExists', '$batch'],
    events: ['testing']
  }

  app.use('/people', createService(options))
}
