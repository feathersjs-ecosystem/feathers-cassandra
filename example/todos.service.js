const createModel = require('./todos.model')
const createService = require('../src')

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
