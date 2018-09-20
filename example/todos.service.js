const createService = require('../src')
const createModel = require('./todos.model')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    paginate: {
      default: 2,
      max: 4
    }
  }

  app.use('/todos', createService(options))
}
