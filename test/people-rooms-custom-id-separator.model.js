module.exports = function (app) {
  const models = app.get('models')
  const PeopleRoomsCustomIdSeparatorModel = models.loadSchema('PeopleRoomsCustomIdSeparator', {
    table_name: 'people_rooms_custom_id_separator',
    fields: {
      people_id: 'int',
      room_id: 'int',
      days: 'counter'
    },
    key: ['people_id', 'room_id']
  }, function (err) {
    if (err) throw err
  })

  PeopleRoomsCustomIdSeparatorModel.syncDB(function (err) {
    if (err) throw err
  })

  return PeopleRoomsCustomIdSeparatorModel
}
