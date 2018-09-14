const createModel = require('./people-mv.model')
const createService = require('../src')

module.exports = function () {
  const app = this

  const options = {
    model: createModel(app),
    cassanknex: app.get('cassanknex'),
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
