module.exports = function (app) {
  const models = app.get('models')
  const PeopleCustomidModel = models.loadSchema('PeopleCustomid', {
    table_name: 'people_customid',
    fields: {
      customid: 'int',
      name: 'text',
      age: 'int',
      time: 'int',
      created: 'boolean'
    },
    key: ['customid'],
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
    if (err) throw err
  })

  PeopleCustomidModel.syncDB(function (err) {
    if (err) throw err
  })

  return PeopleCustomidModel
}
