module.exports = function (app) {
  const models = app.get('models')
  const PeopleModel = models.loadSchema('People', {
    table_name: 'people',
    fields: {
      id: 'int',
      name: {
        type: 'text',
        rule: {
          required: true,
          validators: [
            {
              validator: function (value) { return value !== 'forbidden' },
              message: '`forbidden` is a reserved word'
            }
          ]
        }
      },
      age: {
        type: 'int',
        rule: {
          required: true
        }
      },
      time: 'int',
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
      },
      {
        on: 'time',
        using: 'org.apache.cassandra.index.sasi.SASIIndex',
        options: {}
      }
    ],
    filters: {
      old: builder => {
        builder.where('age', '=', 32)
      }
    }
  }, function (err) {
    if (err) throw err
  })

  PeopleModel.syncDB(function (err) {
    if (err) throw err
  })

  return PeopleModel
}
