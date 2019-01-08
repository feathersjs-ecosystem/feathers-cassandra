const createService = require('../src')
const createModel = require('./people-customid.model')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    multi: ['create', 'patch', 'remove'],
    whitelist: ['$and', '$like', '$token', '$noSelect', '$allowFiltering', '$filters', '$timestamp', '$ttl', '$if', '$ifExists'],
    events: ['testing']
  }

  app.use('/people-customid', createService(options))
}
