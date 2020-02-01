module.exports = function (app) {
  const models = app.get('models');
  const AdapterTestsPeopleCustomIdModel = models.loadSchema('AdapterTestsPeopleCustomId', {
    table_name: 'adapter_tests_people_custom_id',
    fields: {
      custom_id: 'text',
      name: 'text',
      age: 'int',
      created: 'boolean'
    },
    key: ['custom_id'],
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
      instance.custom_id = models.uuid().toString();
      return true;
    }
  }, function (err) {
    if (err) throw err;
  });

  AdapterTestsPeopleCustomIdModel.syncDB(function (err) {
    if (err) throw err;
  });

  return AdapterTestsPeopleCustomIdModel;
};
