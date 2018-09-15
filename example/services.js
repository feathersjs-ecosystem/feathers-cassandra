const todos = require('./todos.service')

module.exports = function (app) {
  app.configure(todos)
}
