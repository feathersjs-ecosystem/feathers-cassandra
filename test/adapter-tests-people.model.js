module.exports = function (app) {
  const models = app.get('models');
  const AdapterTestsPeopleModel = models.loadSchema('AdapterTestsPeople', {
    table_name: 'adapter_tests_people',
    fields: {
      id: 'text',
      name: 'text',
      age: 'int',
      created: 'boolean'
    },
    key: ['id'],
    custom_indexes: [
      {
        on: 'age',
        using: 'org.apache.cassandra.index.sasi.SASIIndex',
        options: {
          mode: 'SPARSE'
        }
      },
      {
        on: 'name',
        using: 'org.apache.cassandra.index.sasi.SASIIndex',
        options: {
          mode: 'CONTAINS'
        }
      },
      {
        on: 'created',
        using: 'org.apache.cassandra.index.sasi.SASIIndex',
        options: {}
      }
    ],
    before_save: function (instance, options) {
      instance.id = models.uuid().toString();
      return true;
    }
  }, function (err) {
    if (err) throw err;
  });

  AdapterTestsPeopleModel.syncDB(function (err) {
    if (err) throw err;
  });

  return AdapterTestsPeopleModel;
};
