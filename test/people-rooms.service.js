const createService = require('../src');
const createModel = require('./people-rooms.model');

module.exports = function (app) {
  const Model = createModel(app);

  const options = {
    model: Model,
    multi: ['create', 'patch'],
    whitelist: ['$token', '$keys', '$condition', '$allowFiltering', '$limitPerPartition', '$contains', '$containsKey', '$minTimeuuid', '$maxTimeuuid', '$if', '$batch'],
    events: ['testing']
  };

  app.use('/people-rooms', createService(options));
};
