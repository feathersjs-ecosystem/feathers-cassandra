module.exports = function (app) {
  const models = app.get('models');
  const PeopleMvModel = models.loadSchema('PeopleMv', {
    table_name: 'people_mv',
    fields: {
      id: 'int',
      name: 'text'
    },
    key: ['id'],
    materialized_views: {
      people_mv_by_name: {
        select: ['id', 'name'],
        key: ['name', 'id']
      }
    },
    options: {
      timestamps: true,
      versions: true
    },
    before_save: function (instance, options) {
      if (!instance.name) { instance.name = 'Default'; } else if (instance.name === 'Forbidden') { return false; }
      return true;
    },
    after_save: function (instance, options) {
      return instance.name !== 'ForbiddenAfter';
    },
    before_update: function (queryObject, updateValues, options, id) {
      if (updateValues.name === 'Replace') { updateValues.name = 'Default'; } else if (updateValues.name === 'Forbidden') { return false; }
      return true;
    },
    after_update: function (queryObject, updateValues, options, id) {
      return updateValues.name !== 'ForbiddenAfter';
    },
    before_delete: function (queryObject, options, id) {
      return !id || id !== 998;
    },
    after_delete: function (queryObject, options, id) {
      return !id || id !== 999;
    }
  }, function (err) {
    if (err) throw err;
  });

  PeopleMvModel.syncDB(function (err) {
    if (err) throw err;
  });

  return PeopleMvModel;
};
