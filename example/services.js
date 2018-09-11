const todos = require('./todos.service');

module.exports = function () {
  const app = this; // eslint-disable-line no-unused-vars
  app.configure(todos);
}
