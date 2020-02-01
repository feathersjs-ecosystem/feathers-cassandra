module.exports = function (app) {
  const models = app.get('models');
  const PeopleCustomIdModel = models.loadSchema('PeopleCustomId', {
    table_name: 'people_custom_id',
    fields: {
      custom_id: 'int',
      name: 'text',
      age: 'int',
      time: 'int',
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
      },
      {
        on: 'time',
        using: 'org.apache.cassandra.index.sasi.SASIIndex',
        options: {}
      }
    ]
  }, function (err) {
    if (err) throw err;
  });

  PeopleCustomIdModel.syncDB(function (err) {
    if (err) throw err;
  });

  return PeopleCustomIdModel;
};
