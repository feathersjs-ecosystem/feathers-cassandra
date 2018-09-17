module.exports = function (app) {
  const models = app.get('models')
  const PeopleRoomModel = models.loadSchema('PeopleRoom', {
    table_name: 'people_rooms',
    fields: {
      people_id: 'int',
      room_id: 'int',
      time: 'int',
      admin: 'boolean',
      teams: {
        type: 'map',
        typeDef: '<varchar, text>'
      },
      games: {
        type: 'list',
        typeDef: '<varchar>'
      },
      winners: {
        type: 'set',
        typeDef: '<varchar>'
      },
      uuid: 'uuid',
      timeuuid: 'timeuuid'
    },
    key: [['people_id', 'room_id'], 'time'],
    custom_indexes: [
      {
        on: 'admin',
        using: 'org.apache.cassandra.index.sasi.SASIIndex',
        options: {}
      }
    ],
    options: {
      timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      },
      versions: {
        key: '_version'
      }
    }
  }, function (err) {
    if (err) throw err
  })

  PeopleRoomModel.syncDB(function (err) {
    if (err) throw err
  })

  return PeopleRoomModel
}
