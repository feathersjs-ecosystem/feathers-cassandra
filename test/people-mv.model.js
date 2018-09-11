module.exports = function (app) {
  const models = app.get('models')
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
    }
  }, function (err) {
    if (err) throw err
  })

  PeopleMvModel.syncDB(function (err) {
    if (err) throw err
  })

  return PeopleMvModel
}
