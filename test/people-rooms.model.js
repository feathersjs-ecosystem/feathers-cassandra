module.exports = function (app) {
  const models = app.get('models')
  const PeopleRoomModel = models.loadSchema('PeopleRoom', {
    table_name: 'people_rooms',
    fields: {
      people_id: 'int',
      room_id: 'int',
      time: 'int',
      admin: 'boolean'
    },
    key: [['people_id', 'room_id'], 'time'],
    custom_indexes: [
      {
        on: 'admin',
        using: 'org.apache.cassandra.index.sasi.SASIIndex',
        options: {}
      }
    ]
  }, function (err) {
    if (err) throw err
  })

  PeopleRoomModel.syncDB(function (err) {
    if (err) throw err
  })

  return PeopleRoomModel
}
