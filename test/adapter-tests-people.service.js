const createService = require('../src');
const createModel = require('./adapter-tests-people.model');
const hooks = require('./adapter-tests-people.hooks');

module.exports = function (app) {
  const Model = createModel(app);

  const options = {
    model: Model,
    whitelist: ['$allowFiltering'],
    events: ['testing']
  };

  app.use('/adapter-tests-people', createService(options));

  const service = app.service('adapter-tests-people');

  service.hooks(hooks);
};
