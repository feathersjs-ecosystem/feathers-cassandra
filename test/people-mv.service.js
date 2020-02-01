const createService = require('../src');
const createModel = require('./people-mv.model');

module.exports = function (app) {
  const Model = createModel(app);

  const options = {
    model: Model,
    multi: ['create'],
    materializedViews: [
      {
        keys: ['name'],
        view: 'people_mv_by_name'
      }
    ],
    events: ['testing']
  };

  app.use('/people-mv', createService(options));
};
