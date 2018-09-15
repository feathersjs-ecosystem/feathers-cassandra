const createModel = require('./people-mv.model')
const createService = require('../src')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    materializedViews: [
      {
        keys: ['name'],
        view: 'people_mv_by_name'
      }
    ],
    events: ['testing']
  }

  app.use('/people-mv', createService(options))
}
