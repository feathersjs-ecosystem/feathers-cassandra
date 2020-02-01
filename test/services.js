const people = require('./people.service');
const peopleCustomId = require('./people-custom-id.service');
const peopleRooms = require('./people-rooms.service');
const peopleRoomsCustomIdSeparator = require('./people-rooms-custom-id-separator.service');
const peopleMaterializedView = require('./people-mv.service');
const adapterTestsPeople = require('./adapter-tests-people.service');
const adapterTestsPeopleCustomId = require('./adapter-tests-people-custom-id.service');

module.exports = function (app) {
  app.configure(people);
  app.configure(peopleCustomId);
  app.configure(peopleRooms);
  app.configure(peopleRoomsCustomIdSeparator);
  app.configure(peopleMaterializedView);
  app.configure(adapterTestsPeople);
  app.configure(adapterTestsPeopleCustomId);
};
