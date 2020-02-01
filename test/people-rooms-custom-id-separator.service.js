const createService = require('../src');
const createModel = require('./people-rooms-custom-id-separator.model');

module.exports = function (app) {
  const Model = createModel(app);

  const options = {
    model: Model,
    idSeparator: '.',
    multi: ['create'],
    whitelist: ['$allowFiltering'],
    events: ['testing']
  };

  app.use('/people-rooms-custom-id-separator', createService(options));
};
