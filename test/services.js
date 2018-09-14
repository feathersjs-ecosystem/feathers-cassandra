const people = require('./people.service')
const peopleCustomid = require('./people-customid.service')
const peopleRooms = require('./people-rooms.service')
const peopleRoomsCustomIdSeparator = require('./people-rooms-custom-id-separator.service')
const peopleMaterializedView = require('./people-mv.service')
const todos = require('../example/todos.model') // runs syncDB

module.exports = function () {
  const app = this // eslint-disable-line no-unused-vars
  app.configure(people)
  app.configure(peopleCustomid)
  app.configure(peopleRooms)
  app.configure(peopleRoomsCustomIdSeparator)
  app.configure(peopleMaterializedView)
  app.configure(todos)
}
