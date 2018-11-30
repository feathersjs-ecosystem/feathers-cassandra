/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const { expect } = require('chai')
const { prepare, refs } = require('./prepare')
const assert = require('assert')
const { base, example } = require('feathers-service-tests-cassandra')
const errors = require('@feathersjs/errors')
const sleep = require('await-sleep')
const server = require('../example/app')
const service = require('../src')
const errorHandler = require('../src/error-handler')

const ERROR_CODES = {
  serverError: 0x0000,
  protocolError: 0x000A,
  badCredentials: 0x0100,
  unavailableException: 0x1000,
  overloaded: 0x1001,
  isBootstrapping: 0x1002,
  truncateError: 0x1003,
  writeTimeout: 0x1100,
  readTimeout: 0x1200,
  readFailure: 0x1300,
  functionFailure: 0x1400,
  writeFailure: 0x1500,
  syntaxError: 0x2000,
  unauthorized: 0x2100,
  invalid: 0x2200,
  configError: 0x2300,
  alreadyExists: 0x2400,
  unprepared: 0x2500
}

let app = null
let models = null
let types = null
let people = null
let peopleMv = null
let peopleRooms = null
let peopleRoomsCustomIdSeparator = null

describe('Feathers Cassandra service', () => {
  before(async () => {
    await prepare()

    app = refs.app()
    models = app.get('models')
    types = models.datatypes
    people = refs.people()
    peopleMv = refs.peopleMv()
    peopleRooms = refs.peopleRooms()
    peopleRoomsCustomIdSeparator = refs.peopleRoomsCustomIdSeparator()
  })

  describe('Initialization', () => {
    describe('when missing options', () => {
      it('throws an error', () => {
        expect(service.bind(null)).to.throw(
          'FeathersCassandra options have to be provided'
        )
      })
    })

    describe('when missing a model', () => {
      it('throws an error', () => {
        expect(service.bind(null, {})).to.throw(
          'You must provide an ExpressCassandra Model'
        )
      })
    })

    describe('when missing CassanKnex object', () => {
      let cassanknex = null

      before(() => {
        cassanknex = service.Service.cassanknex
        service.Service.cassanknex = null
      })

      after(() => {
        service.Service.cassanknex = cassanknex
      })

      it('throws an error', () => {
        return people.get(1).then(() => {
          throw new Error('Should never get here')
        }).catch(function (error) {
          expect(error).to.be.ok
          expect(error instanceof errors.GeneralError).to.be.ok
          expect(error.message).to.equal('You must bind FeathersCassandra with an initialized CassanKnex object')
        })
      })
    })

    describe('when missing the paginate option', () => {
      it('sets the default to be {}', () => {
        expect(people.paginate).to.deep.equal({})
      })
    })

    describe('when missing filters', () => {
      it('sets the default to be {}', () => {
        expect(peopleRooms.filters).to.deep.equal({})
      })
    })
  })

  describe('error handler', () => {
    it('no error code', () => {
      const error = new Error('Unknown Error')
      expect(errorHandler.bind(null, error)).to.throw('Unknown Error')
      expect(errorHandler.bind(null, error)).to.not.throw(errors.GeneralError)
    })

    it('Unknown error code', () => {
      const error = new Error()
      error.code = 999
      expect(errorHandler.bind(null, error)).to.throw(errors.GeneralError)
    })

    it('syntaxError', () => {
      const error = new Error()
      error.code = ERROR_CODES.syntaxError
      expect(errorHandler.bind(null, error)).to.throw(errors.BadRequest)
    })

    it('invalid', () => {
      const error = new Error()
      error.code = ERROR_CODES.invalid
      expect(errorHandler.bind(null, error)).to.throw(errors.BadRequest)
    })

    it('truncateError', () => {
      const error = new Error()
      error.code = ERROR_CODES.truncateError
      expect(errorHandler.bind(null, error)).to.throw(errors.BadRequest)
    })

    it('badCredentials', () => {
      const error = new Error()
      error.code = ERROR_CODES.badCredentials
      expect(errorHandler.bind(null, error)).to.throw(errors.NotAuthenticated)
    })

    it('unauthorized', () => {
      const error = new Error()
      error.code = ERROR_CODES.unauthorized
      expect(errorHandler.bind(null, error)).to.throw(errors.Forbidden)
    })

    it('functionFailure', () => {
      const error = new Error()
      error.code = ERROR_CODES.functionFailure
      expect(errorHandler.bind(null, error)).to.throw(errors.MethodNotAllowed)
    })

    it('protocolError', () => {
      const error = new Error()
      error.code = ERROR_CODES.protocolError
      expect(errorHandler.bind(null, error)).to.throw(errors.NotAcceptable)
    })

    it('readTimeout', () => {
      const error = new Error()
      error.code = ERROR_CODES.readTimeout
      expect(errorHandler.bind(null, error)).to.throw(errors.Timeout)
    })

    it('writeTimeout', () => {
      const error = new Error()
      error.code = ERROR_CODES.writeTimeout
      expect(errorHandler.bind(null, error)).to.throw(errors.Timeout)
    })

    it('alreadyExists', () => {
      const error = new Error()
      error.code = ERROR_CODES.alreadyExists
      expect(errorHandler.bind(null, error)).to.throw(errors.Conflict)
    })

    it('overloaded', () => {
      const error = new Error()
      error.code = ERROR_CODES.overloaded
      expect(errorHandler.bind(null, error)).to.throw(errors.Unprocessable)
    })

    it('configError', () => {
      const error = new Error()
      error.code = ERROR_CODES.configError
      expect(errorHandler.bind(null, error)).to.throw(errors.GeneralError)
    })

    it('serverError', () => {
      const error = new Error()
      error.code = ERROR_CODES.serverError
      expect(errorHandler.bind(null, error)).to.throw(errors.GeneralError)
    })

    it('readFailure', () => {
      const error = new Error()
      error.code = ERROR_CODES.readFailure
      expect(errorHandler.bind(null, error)).to.throw(errors.GeneralError)
    })

    it('writeFailure', () => {
      const error = new Error()
      error.code = ERROR_CODES.writeFailure
      expect(errorHandler.bind(null, error)).to.throw(errors.GeneralError)
    })

    it('unprepared', () => {
      const error = new Error()
      error.code = ERROR_CODES.unprepared
      expect(errorHandler.bind(null, error)).to.throw(errors.NotImplemented)
    })

    it('isBootstrapping', () => {
      const error = new Error()
      error.code = ERROR_CODES.isBootstrapping
      expect(errorHandler.bind(null, error)).to.throw(errors.Unavailable)
    })

    it('unavailableException', () => {
      const error = new Error()
      error.code = ERROR_CODES.unavailableException
      expect(errorHandler.bind(null, error)).to.throw(errors.Unavailable)
    })
  })

  describe('Composite PK queries', () => {
    beforeEach(async () => {
      await peopleRooms
        .create([
          {
            people_id: 1,
            room_id: 1,
            time: 1,
            admin: true
          },
          {
            people_id: 1,
            room_id: 2,
            time: 2,
            admin: false
          },
          {
            people_id: 2,
            room_id: 2,
            time: 3,
            admin: true
          },
          {
            people_id: 2,
            room_id: 2,
            time: 4,
            admin: true
          }
        ])

      await peopleRoomsCustomIdSeparator
        .patch([1, 2], {
          days: {
            $increment: 1
          }
        })

      await peopleRoomsCustomIdSeparator
        .patch([2, 2], {
          days: {
            $increment: 2
          }
        })
    })

    afterEach(async () => {
      try {
        await peopleRooms.remove([1, 1, 1])
      } catch (err) {}
      try {
        await peopleRooms.remove([1, 2, 2])
      } catch (err) {}
      try {
        await peopleRooms.remove([2, 2, 3])
      } catch (err) {}
      try {
        await peopleRooms.remove([2, 2, 4])
      } catch (err) {}
      try {
        await peopleRooms.remove([999, 999, 999])
      } catch (err) {}
      try {
        await peopleRoomsCustomIdSeparator.remove([1, 2])
      } catch (err) {}
      try {
        await peopleRoomsCustomIdSeparator.remove([2, 2])
      } catch (err) {}
    })

    it('allows get queries', () => {
      return peopleRooms.get([2, 2, 3]).then(data => {
        expect(data.people_id).to.equal(2)
        expect(data.room_id).to.equal(2)
        expect(data.admin).to.equal(true)
      })
    })

    it('allows get queries by object', () => {
      return peopleRooms.get({ people_id: 2, room_id: 2, time: 3 }).then(data => {
        expect(data.people_id).to.equal(2)
      })
    })

    it('allows get queries by separator', () => {
      return peopleRooms.get('2,2,3').then(data => {
        expect(data.people_id).to.equal(2)
      })
    })

    it('allows get queries by custom separator', () => {
      return peopleRoomsCustomIdSeparator.get('2.2').then(data => {
        expect(data.people_id).to.equal(2)
      })
    })

    it('allows get queries by array in string', () => {
      return peopleRoomsCustomIdSeparator.get('[2, 2]').then(data => {
        expect(data.people_id).to.equal(2)
      })
    })

    it('allows get queries by object in string', () => {
      return peopleRoomsCustomIdSeparator.get('{ "people_id": 2, "room_id": 2 }').then(data => {
        expect(data.people_id).to.equal(2)
      })
    })

    it('get with partial id in string throws an error', () => {
      return peopleRooms.update('2', { admin: false }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('When using composite primary key, id must contain values for all primary keys')
      })
    })

    it('allows find queries', () => {
      return peopleRooms.find({ query: { people_id: 2, room_id: 2 } }).then(data => {
        expect(data.length).to.equal(2)
        expect(data[0].people_id).to.equal(2)
        expect(data[1].people_id).to.equal(2)
      })
    })

    it('allows find with $token queries', () => {
      return peopleRooms.find({
        query: {
          $token: {
            $keys: ['people_id', 'room_id'],
            $condition: { $gt: [1, 2] }
          }
        }
      }).then(data => {
        expect(data.length).to.equal(1)
        expect(data[0].people_id).to.equal(1)
        expect(data[0].room_id).to.equal(1)
      })
    })

    it('allows update queries', () => {
      return peopleRooms.update([2, 2, 3], { people_id: 1, admin: false }).then(data => {
        expect(data.people_id).to.equal(2)
        expect(data.admin).to.equal(false)
      })
    })

    it('update multiple records throws an error', () => {
      return peopleRooms.update([2, 2, 3], [{ admin: false }]).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('Not replacing multiple records. Did you mean `patch`?')
      })
    })

    it('update with partial id throws an error', () => {
      return peopleRooms.update([2, 2], { admin: false }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('When using composite primary key, id must contain values for all primary keys')
      })
    })

    it('allows patch queries', () => {
      return peopleRooms.patch([2, 2, 3], { people_id: 1, admin: false }).then(data => {
        expect(data.people_id).to.equal(2)
        expect(data.admin).to.equal(false)
      })
    })

    it('patch multiple records', () => {
      return peopleRooms.patch(null, { people_id: 1, admin: false }, {
        query: {
          people_id: 2,
          room_id: 2,
          time: {
            $in: [3, 4]
          },
          $select: ['people_id', 'admin']
        }
      }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(2)
        expect(data[0].people_id).to.equal(2)
        expect(data[0].admin).to.equal(false)
        expect(data[1].people_id).to.equal(2)
        expect(data[1].admin).to.equal(false)
      })
    })

    it('patch with partial id throws an error', () => {
      return peopleRooms.patch([2, 2], { admin: false }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('When using composite primary key, id must contain values for all primary keys')
      })
    })

    it('patch with id and no results throws an error', () => {
      return peopleRooms.patch([999, 999, 999], { admin: false }, {
        query: {
          $if: {
            admin: true
          }
        }
      }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.NotFound).to.be.ok
        expect(error.message).to.equal('No record found for id \'999,999,999\'')
      })
    })

    it('patch with invalid id', () => {
      return peopleRooms.patch(false, { admin: false }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('Invalid null value in condition for column people_id')
      })
    })

    it('allows remove queries', () => {
      return peopleRooms.remove([2, 2, 3]).then(() => {
        return peopleRooms.find().then(data => {
          expect(data.length).to.equal(3)
        })
      })
    })
  })

  describe('$noSelect', () => {
    beforeEach(async () => {
      await people
        .create({
          id: 1,
          name: 'Dave',
          age: 10,
          created: true
        })
    })

    it('create with $noSelect', () => {
      return people.create({
        id: 2,
        name: 'John',
        age: 10
      }, {
        query: {
          $noSelect: true
        }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.id).to.equal(2)
        expect(data.name).to.equal('John')
        expect(data.age).to.equal(10)
      })
    })

    it('patch with $noSelect', () => {
      return people.patch(1, { name: 'John' }, { query: { $noSelect: true } }).then(data => {
        expect(data).to.be.ok
        expect(data).to.be.empty
      })
    })

    it('update with $noSelect', () => {
      return people.update(1, { name: 'John', age: 10 }, { query: { $noSelect: true } }).then(data => {
        expect(data).to.be.ok
        expect(data.name).to.equal('John')
        expect(data.created).to.equal(null)
      })
    })

    it('remove with $noSelect', () => {
      return people.remove(1, {
        query: {
          $noSelect: true
        }
      }).then(data => {
        expect(data).to.be.ok
        expect(data).to.be.empty
      })
    })
  })

  describe('cast string to boolean', () => {
    beforeEach(async () => {
      await peopleRooms
        .create([
          {
            people_id: 1,
            room_id: 1,
            time: 1,
            admin: true
          },
          {
            people_id: 2,
            room_id: 2,
            time: 2,
            admin: false
          }
        ])
    })

    afterEach(async () => {
      await peopleRooms.remove([1, 1, 1])
      await peopleRooms.remove([2, 2, 2])
    })

    it('find with \'false\'', () => {
      return peopleRooms.find({ query: { admin: 'false' } }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].people_id).to.equal(2)
        expect(data[0].admin).to.equal(false)
      })
    })

    it('find with \'0\'', () => {
      return peopleRooms.find({ query: { admin: '0' } }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].people_id).to.equal(2)
        expect(data[0].admin).to.equal(false)
      })
    })

    it('find with \'\'', () => {
      return peopleRooms.find({ query: { admin: '' } }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].people_id).to.equal(2)
        expect(data[0].admin).to.equal(false)
      })
    })
  })

  describe('$like method', () => {
    beforeEach(async () => {
      await people
        .create({
          id: 1,
          name: 'Charlie Brown',
          age: 10
        })
    })

    afterEach(async () => {
      await people.remove(1)
    })

    it('$like in query', () => {
      return people.find({ query: { name: { $like: '%lie%' } } }).then(data => {
        expect(data[0].name).to.equal('Charlie Brown')
      })
    })
  })

  describe('$and method', () => {
    beforeEach(async () => {
      await people
        .create([
          {
            id: 1,
            name: 'Dave',
            age: 23
          },
          {
            id: 2,
            name: 'Dave',
            age: 32
          },
          {
            id: 3,
            name: 'Dada',
            age: 1
          }
        ])
    })

    afterEach(async () => {
      try {
        await people.remove(1)
      } catch (err) {}
      try {
        await people.remove(2)
      } catch (err) {}
      try {
        await people.remove(3)
      } catch (err) {}
    })

    it('$and in query', () => {
      return people.find({ query: { $and: [{ name: 'Dave' }, { age: { $lt: 32 } }], $allowFiltering: true } }).then(data => {
        expect(data[0].age).to.equal(23)
      })
    })
  })

  describe('$or method', () => {
    beforeEach(async () => {
      await people
        .create([
          {
            id: 1,
            name: 'Dave',
            age: 23
          },
          {
            id: 2,
            name: 'Dave',
            age: 32
          },
          {
            id: 3,
            name: 'Dada',
            age: 1
          }
        ])
    })

    afterEach(async () => {
      try {
        await people.remove(1)
      } catch (err) {}
      try {
        await people.remove(2)
      } catch (err) {}
      try {
        await people.remove(3)
      } catch (err) {}
    })

    it('$or in query', () => {
      return people.find({ query: { $or: [{ name: 'John' }, { name: 'Dada' }] } }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('`$or` is not supported')
      })
    })
  })

  describe('$token query', () => {
    beforeEach(async () => {
      await people
        .create([
          {
            id: 1,
            name: 'Dave',
            age: 23
          },
          {
            id: 2,
            name: 'John',
            age: 32
          },
          {
            id: 3,
            name: 'Dada',
            age: 1
          }
        ])
    })

    afterEach(async () => {
      try {
        await people.remove(1)
      } catch (err) {}
      try {
        await people.remove(2)
      } catch (err) {}
      try {
        await people.remove(3)
      } catch (err) {}
    })

    it('$token $gt query', () => {
      return people.find({
        query: {
          $token: {
            id: {
              $gt: 1
            }
          }
        }
      }).then(data => {
        expect(data.length).to.equal(2)
        expect(data[0].name).to.equal('John')
        expect(data[1].name).to.equal('Dada')
      })
    })
  })

  describe('validators', () => {
    beforeEach(async () => {
      try {
        await people.remove(1)
      } catch (err) {}
    })

    afterEach(async () => {
      try {
        await people.remove(1)
      } catch (err) {}
    })

    it('can validate create data', () => {
      return people.create({ id: 1, name: 'forbidden', age: 30 }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`forbidden` is a reserved word')
      })
    })

    it('can validate create data required fields', () => {
      return people.create({ id: 1, name: 'John' }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate create data required fields with undefined', () => {
      return people.create({ id: 1, name: 'John', age: undefined }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate create data required fields with null', () => {
      return people.create({ id: 1, name: 'John', age: null }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can pass validate create data', () => {
      return people.create({ id: 1, name: 'John', age: 30 }).then(data => {
        expect(data.name).to.equal('John')
      })
    })

    it('can validate multiple create data', () => {
      return people.create([{ id: 1, name: 'forbidden', age: 30 }]).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`forbidden` is a reserved word')
      })
    })

    it('can validate multiple create data required fields', () => {
      return people.create([{ id: 1, name: 'John' }]).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate multiple create data required fields with undefined', () => {
      return people.create([{ id: 1, name: 'John', age: undefined }]).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate multiple create data required fields with null', () => {
      return people.create([{ id: 1, name: 'John', age: null }]).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can pass validate multiple create data', () => {
      return people.create([{ id: 1, name: 'John', age: 30 }]).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].name).to.equal('John')
      })
    })

    it('can validate update data', () => {
      return people.update(1, { name: 'forbidden', age: 30 }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`forbidden` is a reserved word')
      })
    })

    it('can validate update data required fields', () => {
      return people.update(1, { name: 'John' }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate update data required fields with undefined', () => {
      return people.update(1, { name: 'John', age: null }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate update data required fields with null', () => {
      return people.update(1, { name: 'John', age: null }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can pass validate update data', () => {
      return people.create({ id: 1, name: 'Dave', age: 30 }).then(() => {
        return people.update(1, { name: 'John', age: 30 }).then(data => {
          expect(data.name).to.equal('John')
        })
      })
    })

    it('can validate patch data', () => {
      return people.patch(1, { name: 'forbidden' }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`forbidden` is a reserved word')
      })
    })

    it('can validate patch data required fields with undefined', () => {
      return people.patch(1, { name: 'John', age: undefined }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate patch data required fields with null', () => {
      return people.patch(1, { name: 'John', age: null }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can pass validate patch data', () => {
      return people.patch(1, { name: 'John' }).then(data => {
        expect(data.name).to.equal('John')
      })
    })

    it('can validate multiple patch data', () => {
      return people.patch(null, { name: 'forbidden' }, { query: { id: 1 } }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`forbidden` is a reserved word')
      })
    })

    it('can pass validate multiple patch data', () => {
      return people.create({ id: 1, name: 'Dave', age: 30 }).then(() => {
        return people.patch(null, { name: 'John' }, { query: { id: 1 } }).then(data => {
          expect(data).to.be.instanceof(Array)
          expect(data.length).to.equal(1)
          expect(data[0].name).to.equal('John')
        })
      })
    })
  })

  describe('filters', () => {
    beforeEach(async () => {
      people.paginate = { default: 10, max: 20 }

      await people
        .create([
          {
            id: 1,
            name: 'Dave',
            age: 25
          },
          {
            id: 2,
            name: 'John',
            age: 32
          },
          {
            id: 3,
            name: 'Dada',
            age: 29
          }
        ])
    })

    afterEach(async () => {
      people.paginate = {}

      try {
        await people.remove(1)
      } catch (err) {}
      try {
        await people.remove(2)
      } catch (err) {}
      try {
        await people.remove(3)
      } catch (err) {}
    })

    it('can query with named filter', () => {
      return people.find({ query: { $filters: 'old' } }).then(data => {
        expect(data).to.be.ok
        expect(data.total).to.equal(1)
        expect(data.data.length).to.equal(1)
        expect(data.data[0].name).to.equal('John')
      })
    })
  })

  describe('materialized views', () => {
    beforeEach(async () => {
      await peopleMv
        .create([
          {
            id: 1,
            name: 'Dave'
          },
          {
            id: 2,
            name: 'John'
          },
          {
            id: 3,
            name: 'Dada'
          }
        ])
    })

    it('can query from materialized view', () => {
      return peopleMv.find({ query: { name: 'Dada' } }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].name).to.equal('Dada')
      })
    })
  })

  describe('$limitPerPartition', () => {
    beforeEach(async () => {
      await peopleRooms
        .create([
          {
            people_id: 1,
            room_id: 1,
            time: 1,
            admin: false
          },
          {
            people_id: 2,
            room_id: 2,
            time: 2,
            admin: false
          },
          {
            people_id: 2,
            room_id: 2,
            time: 3,
            admin: false
          }
        ])
    })

    afterEach(async () => {
      try {
        await peopleRooms.remove([1, 1, 1])
      } catch (err) {}
      try {
        await peopleRooms.remove([2, 2, 2])
      } catch (err) {}
      try {
        await peopleRooms.remove([2, 2, 3])
      } catch (err) {}
    })

    it('find', () => {
      return peopleRooms.find({
        query: {
          admin: false,
          $limitPerPartition: 1
        }
      }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(2)
        expect(data[0].people_id).to.equal(2)
        expect(data[0].time).to.equal(2)
        expect(data[1].people_id).to.equal(1)
      })
    })
  })

  describe('uuid & timeuuid', () => {
    let uuid1 = null;
    let timeuuid1 = null
    let uuid2 = null
    let timeuuid2 = null

    before(() => {
      uuid1 = models.uuidFromString('d9e41929-2e9a-4619-bb06-b07fa7ef1461')
      timeuuid1 = models.timeuuidFromString('66260eb0-ba6a-11e8-b27a-c6c477aea255')

      uuid2 = models.uuidFromString('d9e41929-2e9a-4619-bb06-b07fa7ef1462')
      timeuuid2 = models.timeuuidFromString('b48af500-ba6c-11e8-b1b4-1503c0dbeff1')
    })

    beforeEach(async () => {
      await peopleRooms
        .create([
          {
            people_id: 1,
            room_id: 1,
            time: 1,
            admin: false,
            uuid: uuid1.toString(),
            timeuuid: timeuuid1.toString()
          },
          {
            people_id: 2,
            room_id: 2,
            time: 2,
            admin: false,
            uuid: uuid2,
            timeuuid: timeuuid2
          }
        ])
    })

    afterEach(async () => {
      try {
        await peopleRooms.remove([1, 1, 1])
      } catch (err) {}
      try {
        await peopleRooms.remove([2, 2, 2])
      } catch (err) {}
    })

    it('get', () => {
      return peopleRooms.get([1, 1, 1]).then(data => {
        expect(data).to.be.ok
        expect(data.people_id).to.equal(1)
        expect(data.uuid.toString()).to.equal(uuid1.toString())
        expect(data.timeuuid.toString()).to.equal(timeuuid1.toString())

        return peopleRooms.get([2, 2, 2]).then(data => {
          expect(data).to.be.ok
          expect(data.people_id).to.equal(2)
          expect(data.uuid.toString()).to.equal(uuid2.toString())
          expect(data.timeuuid.toString()).to.equal(timeuuid2.toString())
        })
      })
    })

    it('find with string', () => {
      return peopleRooms.find({
        query: {
          uuid: uuid1.toString(),
          timeuuid: timeuuid1.toString(),
          $allowFiltering: true
        }
      }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].uuid.toString()).to.equal(uuid1.toString())
        expect(data[0].timeuuid.toString()).to.equal(timeuuid1.toString())
      })
    })

    it('find with object', () => {
      return peopleRooms.find({
        query: {
          uuid: models.uuidFromString(uuid2.toString()),
          timeuuid: models.timeuuidFromString(timeuuid2.toString()),
          $allowFiltering: true
        }
      }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].uuid.toString()).to.equal(uuid2.toString())
        expect(data[0].timeuuid.toString()).to.equal(timeuuid2.toString())
      })
    })

    it('find with object & uuid in array', () => {
      return peopleRooms.find({
        query: {
          $token: {
            $keys: ['people_id', 'room_id'],
            $condition: { $gt: [uuid1, uuid1] }
          }
        }
      }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal(`Expected Number, obtained '${uuid1.toString()}'`)
      })
    })

    it('find with object & timeuuid in array', () => {
      return peopleRooms.find({
        query: {
          $token: {
            $keys: ['people_id', 'room_id'],
            $condition: { $gt: [timeuuid1, timeuuid1] }
          }
        }
      }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal(`Expected Number, obtained '${timeuuid1.toString()}'`)
      })
    })
  })

  describe('map, list, set', () => {
    beforeEach(async () => {
      await peopleRooms
        .create([
          {
            people_id: 1,
            room_id: 1,
            time: 1,
            admin: false,
            teams: { a: 'b', c: 'd' },
            games: ['a', 'b', 'b'],
            winners: ['a', 'b', 'b']
          },
          {
            people_id: 2,
            room_id: 2,
            time: 2,
            admin: false,
            teams: { x: 'x', y: 'y' },
            games: ['x', 'y', 'y'],
            winners: ['x', 'y', 'y']
          }
        ])
    })

    afterEach(async () => {
      try {
        await peopleRooms.remove([1, 1, 1])
      } catch (err) {}
      try {
        await peopleRooms.remove([2, 2, 2])
      } catch (err) {}
      try {
        await peopleRooms.remove([3, 3, 3])
      } catch (err) {}
    })

    it('get', () => {
      return peopleRooms.get([1, 1, 1]).then(data => {
        expect(data).to.be.ok
        expect(data.people_id).to.equal(1)
        expect(data.teams).to.be.deep.equal({ a: 'b', c: 'd' })
        expect(data.games).to.be.deep.equal(['a', 'b', 'b'])
        expect(data.winners).to.be.deep.equal(['a', 'b'])

        return peopleRooms.get([2, 2, 2]).then(data => {
          expect(data).to.be.ok
          expect(data.people_id).to.equal(2)
        })
      })
    })

    it('find contains', () => {
      return peopleRooms.find({
        query: {
          teams: {
            $contains: 'd'
          },
          games: {
            $contains: 'a'
          },
          winners: {
            $contains: 'b'
          },
          $allowFiltering: true
        }
      }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].people_id).to.equal(1)
        expect(data[0].teams).to.be.deep.equal({ a: 'b', c: 'd' })
        expect(data[0].games).to.be.deep.equal(['a', 'b', 'b'])
        expect(data[0].winners).to.be.deep.equal(['a', 'b'])
      })
    })

    it('find containsKey', () => {
      return peopleRooms.find({
        query: {
          teams: {
            $containsKey: 'a'
          },
          $allowFiltering: true
        }
      }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].people_id).to.equal(1)
        expect(data[0].teams).to.be.deep.equal({ a: 'b', c: 'd' })
        expect(data[0].games).to.be.deep.equal(['a', 'b', 'b'])
        expect(data[0].winners).to.be.deep.equal(['a', 'b'])
      })
    })

    it('create', () => {
      return peopleRooms.create({
        people_id: 3,
        room_id: 3,
        time: 3,
        admin: false,
        teams: { a: 'b', c: 'd' },
        games: ['a', 'b', 'b'],
        winners: ['a', 'b', 'b']
      }).then(data => {
        expect(data).to.be.ok
        expect(data.people_id).to.equal(3)
        expect(data.teams).to.be.deep.equal({ a: 'b', c: 'd' })
        expect(data.games).to.be.deep.equal(['a', 'b', 'b'])
        expect(data.winners).to.be.deep.equal(['a', 'b'])
      })
    })

    it('update', () => {
      return peopleRooms.update([1, 1, 1], {
        admin: false,
        teams: { b: 'c', d: 'e' },
        games: ['b', 'c', 'c'],
        winners: ['b', 'c', 'c']
      }).then(data => {
        expect(data).to.be.ok
        expect(data.people_id).to.equal(1)
        expect(data.teams).to.be.deep.equal({ b: 'c', d: 'e' })
        expect(data.games).to.be.deep.equal(['b', 'c', 'c'])
        expect(data.winners).to.be.deep.equal(['b', 'c'])
        expect(data.created_at).to.be.ok
        expect(data.updated_at).to.be.ok
        expect(data.created_at.toString()).to.not.equal(data.updated_at.toString())
        expect(data._version).to.be.ok
      })
    })

    it('update with $add', () => {
      return peopleRooms.update([1, 1, 1], {
        admin: false,
        teams: { $add: { b: 'c', d: 'e' } },
        games: { $add: ['b', 'c', 'c'] },
        winners: { $add: ['b', 'c', 'c'] }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.teams).to.be.deep.equal({ a: 'b', c: 'd', b: 'c', d: 'e' })
        expect(data.games).to.be.deep.equal(['a', 'b', 'b', 'b', 'c', 'c'])
        expect(data.winners).to.be.deep.equal(['a', 'b', 'c'])
      })
    })

    it('update with $remove', () => {
      return peopleRooms.update([1, 1, 1], {
        admin: false,
        teams: { $remove: ['a', 'z'] },
        games: { $remove: ['b', 'z'] },
        winners: { $remove: ['b', 'z'] }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.teams).to.be.deep.equal({ c: 'd' })
        expect(data.games).to.be.deep.equal(['a'])
        expect(data.winners).to.be.deep.equal(['a'])
      })
    })

    it('update with $remove to null', () => {
      return peopleRooms.update([1, 1, 1], {
        admin: false,
        teams: { $remove: ['a', 'c'] },
        games: { $remove: ['a', 'b'] },
        winners: { $remove: ['a', 'b'] }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.teams).to.equal(null)
        expect(data.games).to.equal(null)
        expect(data.winners).to.equal(null)
      })
    })

    it('patch', () => {
      return peopleRooms.patch([1, 1, 1], {
        teams: { b: 'c', d: 'e' },
        games: ['b', 'c', 'c'],
        winners: ['b', 'c', 'c']
      }).then(data => {
        expect(data).to.be.ok
        expect(data.teams).to.be.deep.equal({ b: 'c', d: 'e' })
        expect(data.games).to.be.deep.equal(['b', 'c', 'c'])
        expect(data.winners).to.be.deep.equal(['b', 'c'])
      })
    })

    it('patch with $add', () => {
      return peopleRooms.patch([1, 1, 1], {
        teams: { $add: { b: 'c', d: 'e' } },
        games: { $add: ['b', 'c', 'c'] },
        winners: { $add: ['b', 'c', 'c'] }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.teams).to.be.deep.equal({ a: 'b', c: 'd', b: 'c', d: 'e' })
        expect(data.games).to.be.deep.equal(['a', 'b', 'b', 'b', 'c', 'c'])
        expect(data.winners).to.be.deep.equal(['a', 'b', 'c'])
      })
    })

    it('patch with $remove', () => {
      return peopleRooms.patch([1, 1, 1], {
        teams: { $remove: ['a', 'z'] },
        games: { $remove: ['b', 'z'] },
        winners: { $remove: ['b', 'z'] }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.teams).to.be.deep.equal({ c: 'd' })
        expect(data.games).to.be.deep.equal(['a'])
        expect(data.winners).to.be.deep.equal(['a'])
      })
    })

    it('patch with $remove to null', () => {
      return peopleRooms.patch([1, 1, 1], {
        teams: { $remove: ['a', 'c'] },
        games: { $remove: ['a', 'b'] },
        winners: { $remove: ['a', 'b'] }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.teams).to.equal(null)
        expect(data.games).to.equal(null)
        expect(data.winners).to.equal(null)
      })
    })
  })

  describe('increment & decrement', () => {
    beforeEach(async () => {
      await peopleRoomsCustomIdSeparator
        .update([1, 1], {
          days: {
            $increment: 1
          }
        }, {
          query: {
            $noSelect: true
          }
        })
    })

    it('get', () => {
      return peopleRoomsCustomIdSeparator.get([1, 1]).then(data => {
        expect(data).to.be.ok
        expect(data.people_id).to.equal(1)
        expect(data.days.toString()).to.equal('1')
      })
    })

    it('find', () => {
      return peopleRoomsCustomIdSeparator.find({
        query: {
          days: 2,
          $allowFiltering: true
        }
      }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].people_id).to.equal(1)
        expect(data[0].days.toString()).to.equal('2')
      })
    })

    it('update increment', () => {
      return peopleRoomsCustomIdSeparator.update([1, 1], {
        days: {
          $increment: 2
        }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.people_id).to.equal(1)
        expect(data.days.toString()).to.equal('5')
      })
    })

    it('update decrement', () => {
      return peopleRoomsCustomIdSeparator.update([1, 1], {
        days: {
          $decrement: 1
        }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.people_id).to.equal(1)
        expect(data.days.toString()).to.equal('5')
      })
    })

    it('patch increment', () => {
      return peopleRoomsCustomIdSeparator.patch([1, 1], {
        days: {
          $increment: 2
        }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.people_id).to.equal(1)
        expect(data.days.toString()).to.equal('8')
      })
    })

    it('patch decrement', () => {
      return peopleRoomsCustomIdSeparator.patch([1, 1], {
        days: {
          $decrement: 1
        }
      }).then(data => {
        expect(data).to.be.ok
        expect(data.people_id).to.equal(1)
        expect(data.days.toString()).to.equal('8')
      })
    })
  })

  describe('special selectors', () => {
    const timestamp = Date.now() * 1000
    let timeuuid = null

    before(async () => {
      timeuuid = models.timeuuidFromString('66260eb0-ba6a-11e8-b27a-c6c477aea255')

      await people
        .create({
          id: 7,
          name: 'Dave',
          age: 10
        }, {
          query: {
            $ttl: 600,
            $timestamp: timestamp
          }
        })

      await peopleRooms
        .create({
          people_id: 1,
          room_id: 1,
          time: 1,
          admin: false,
          timeuuid
        })
    })

    after(async () => {
      try {
        await people.remove(7)
      } catch (err) {}
      try {
        await peopleRooms.remove([1, 1, 1])
      } catch (err) {}
    })

    it('find with ttl & writetime', () => {
      return people.find({
        query: {
          id: 7,
          $select: ['ttl(name)', 'writetime(name)']
        }
      }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0]['ttl(name)']).to.be.ok
        expect(data[0]['writetime(name)'].toString()).to.equal(timestamp.toString())
      })
    })

    it('get timeuuid with time functions', () => {
      return peopleRooms.get([1, 1, 1], {
        query: {
          $select: ['dateOf(timeuuid)', 'unixTimestampOf(timeuuid)', 'toDate(timeuuid)', 'toTimestamp(timeuuid)', 'toUnixTimestamp(timeuuid)']
        }
      }).then(data => {
        expect(data).to.be.ok
        expect(data['dateOf(timeuuid)'].toISOString()).to.equal('2018-09-17T11:11:17.787Z')
        expect(data['unixTimestampOf(timeuuid)'].toString()).to.equal('1537182677787')
        expect(data['toDate(timeuuid)'].toString()).to.equal('2018-09-17')
        expect(data['toTimestamp(timeuuid)'].toISOString()).to.equal('2018-09-17T11:11:17.787Z')
        expect(data['toUnixTimestamp(timeuuid)'].toString()).to.equal('1537182677787')
      })
    })
  })

  describe('minTimeuuid & maxTimeuuid', () => {
    let timeuuid1 = null
    let timeuuid2 = null

    before(async () => {
      timeuuid1 = models.timeuuidFromString('66260eb0-ba6a-11e8-b27a-c6c477aea255')
      timeuuid2 = models.timeuuidFromString('b48af500-ba6c-11e8-b1b4-1503c0dbeff1')

      await peopleRooms
        .create({
          people_id: 1,
          room_id: 1,
          time: 1,
          admin: false,
          timeuuid: timeuuid1
        })

      await peopleRooms
        .create({
          people_id: 2,
          room_id: 2,
          time: 2,
          admin: false,
          timeuuid: timeuuid2
        })
    })

    after(async () => {
      try {
        await peopleRooms.remove([1, 1, 1])
      } catch (err) {}
      try {
        await peopleRooms.remove([2, 2, 2])
      } catch (err) {}
    })

    it('find with minTimeuuid and maxTimeuuid', () => {
      return peopleRooms.find({
        query: {
          $minTimeuuid: {
            timeuuid: {
              $gt: new Date(timeuuid1.getDate().getTime() + 1000).toISOString()
            }
          },
          $maxTimeuuid: {
            timeuuid: {
              $lt: new Date(timeuuid2.getDate().getTime() + 1000).toISOString()
            }
          },
          $allowFiltering: true
        }
      }).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].people_id).to.equal(2)
        expect(data[0].timeuuid.toString()).to.equal(timeuuid2.toString())
      })
    })
  })

  describe('auto-generated fields', () => {
    before(async () => {
      await peopleRooms
        .create({
          people_id: 1,
          room_id: 1,
          time: 1,
          admin: false
        })
    })

    after(async () => {
      try {
        await peopleRooms.remove([1, 1, 1])
      } catch (err) {}
      try {
        await peopleMv.remove(1)
      } catch (err) {}
    })

    it('field exists when enabled with boolean', () => {
      return peopleRooms.get([1, 1, 1]).then(data => {
        expect(data).to.be.ok
        expect(data.people_id).to.equal(1)
        expect(data._version).to.be.instanceof(types.TimeUuid)
        expect(data.created_at).to.be.instanceof(Date)
        expect(data.updated_at).to.be.instanceof(Date)
      })
    })

    it('field exists when enabled with object', () => {
      return peopleMv
        .create({
          id: 1,
          name: 'Dave'
        })
        .then(() => {
          return peopleMv.get(1).then(data => {
            expect(data).to.be.ok
            expect(data.name).to.equal('Dave')
            expect(data.__v).to.be.instanceof(types.TimeUuid)
            expect(data.createdAt).to.be.instanceof(Date)
            expect(data.updatedAt).to.be.instanceof(Date)
          })
        })
    })
  })

  describe('hooks', () => {
    before(async () => {
      await peopleMv
        .create({
          id: 1
        })
    })

    after(async () => {
      try {
        await peopleMv.remove(1)
        await peopleMv.remove(2)
      } catch (err) {}
    })

    it('before_save hook sets default value', () => {
      return peopleMv.get(1).then(data => {
        expect(data).to.be.ok
        expect(data.id).to.equal(1)
        expect(data.name).to.equal('Default')
      })
    })

    it('before_save hook throws an error', () => {
      return peopleMv.create({
        id: 2,
        name: 'Forbidden'
      }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('Error in before_save lifecycle function')
      })
    })

    it('after_save hook throws an error', () => {
      return peopleMv.create({
        id: 2,
        name: 'ForbiddenAfter'
      }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('Error in after_save lifecycle function')
      })
    })

    it('before_update hook replace a value', () => {
      return peopleMv.update(1, { name: 'Replace' }).then(data => {
        expect(data).to.be.ok
        expect(data.id).to.equal(1)
        expect(data.name).to.equal('Default')
      })
    })

    it('before_update hook throws an error', () => {
      return peopleMv.update(1, { name: 'Forbidden' }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('Error in before_update lifecycle function')
      })
    })

    it('after_update hook throws an error', () => {
      return peopleMv.update(1, { name: 'ForbiddenAfter' }).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('Error in after_update lifecycle function')
      })
    })

    it('before_delete hook throws an error', () => {
      return peopleMv.remove(998).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('Error in before_delete lifecycle function')
      })
    })

    it('after_delete hook throws an error', () => {
      return peopleMv.remove(999).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error instanceof errors.BadRequest).to.be.ok
        expect(error.message).to.equal('Error in after_delete lifecycle function')
      })
    })
  })

  describe('$timestamp', () => {
    beforeEach(async () => {
      await people
        .create({
          id: 5,
          name: 'Dave',
          age: 10
        })
    })

    afterEach(async () => {
      try {
        await people.remove(5)
      } catch (err) {}
      try {
        await people.remove(6)
      } catch (err) {}
    })

    it('create with $timestamp', () => {
      const timestamp = (Date.now() - 1000) * 1000

      return people.create({
        id: 6,
        name: 'John',
        age: 10
      }, {
        query: {
          $timestamp: timestamp
        }
      }).then(() => {
        return people.get(6, {
          query: {
            $select: ['writetime(name)']
          }
        }).then(data => {
          expect(data).to.be.ok
          expect(data['writetime(name)'].toString()).to.equal(timestamp.toString())
        })
      })
    })

    it('patch with $timestamp', () => {
      const timestamp = Date.now() * 1000

      return people.patch(5, {
        name: 'John',
        age: 10
      }, {
        query: {
          $timestamp: timestamp
        }
      }).then(() => {
        return people.get(5, {
          query: {
            $select: ['writetime(name)']
          }
        }).then(data => {
          expect(data).to.be.ok
          expect(data['writetime(name)'].toString()).to.equal(timestamp.toString())
        })
      })
    })

    it('update with $timestamp', () => {
      const timestamp = (Date.now() * 1000).toString()

      return people.update(5, {
        name: 'John',
        age: 10
      }, {
        query: {
          $timestamp: timestamp
        }
      }).then(() => {
        return people.get(5, {
          query: {
            $select: ['writetime(name)']
          }
        }).then(data => {
          expect(data).to.be.ok
          expect(data['writetime(name)'].toString()).to.equal(timestamp)
        })
      })
    })
  })

  describe('$ttl', function () {
    this.slow(6000)

    beforeEach(async () => {
      await people
        .create({
          id: 1,
          name: 'Dave',
          age: 10
        })
    })

    it('create with $ttl', () => {
      return people.create({
        id: 2,
        name: 'John',
        age: 10
      }, {
        query: {
          $ttl: 4
        }
      }).then(() => {
        return people.get(2).then(data => {
          expect(data).to.be.ok
          expect(data.name).to.equal('John')

          return sleep(5000).then(() => {
            return people.get(2).then(() => {
              throw new Error('Should never get here')
            }).catch(function (error) {
              expect(error).to.be.ok
              expect(error instanceof errors.NotFound).to.be.ok
            })
          })
        })
      })
    })

    it('create with $timestamp & $ttl', () => {
      const timestamp = Date.now() * 1000

      return people.create({
        id: 6,
        name: 'John',
        age: 10
      }, {
        query: {
          $timestamp: timestamp,
          $ttl: 4
        }
      }).then(() => {
        return people.get(6, {
          query: {
            $select: ['writetime(name)']
          }
        }).then(data => {
          expect(data).to.be.ok
          expect(data['writetime(name)'].toString()).to.equal(timestamp.toString())

          return sleep(5000).then(() => {
            return people.get(6).then(() => {
              throw new Error('Should never get here')
            }).catch(function (error) {
              expect(error).to.be.ok
              expect(error instanceof errors.NotFound).to.be.ok
            })
          })
        })
      })
    })

    it('patch with $ttl', () => {
      return people.patch(1, {
        name: 'John'
      }, {
        query: {
          $ttl: 4
        }
      }).then(() => {
        return people.get(1).then(data => {
          expect(data).to.be.ok
          expect(data.name).to.equal('John')

          return sleep(5000).then(() => {
            return people.get(1).then(data => {
              expect(data).to.be.ok
              expect(data.id).to.equal(1)
              expect(data.name).to.equal(null)
            })
          })
        })
      })
    })

    it('update with $ttl', () => {
      return people.update(1, {
        name: 'John',
        age: 10
      }, {
        query: {
          $ttl: 4
        }
      }).then(() => {
        return people.get(1).then(data => {
          expect(data).to.be.ok
          expect(data.name).to.equal('John')

          return sleep(5000).then(() => {
            return people.get(1).then(data => {
              expect(data).to.be.ok
              expect(data.id).to.equal(1)
              expect(data.name).to.equal(null)
            })
          })
        })
      })
    })

    it('update with $ttl 0', () => {
      return people.update(1, {
        name: 'John',
        age: 10
      }, {
        query: {
          $ttl: 4
        }
      }).then(() => {
        return people.update(1, {
          name: 'John',
          age: 10
        }, {
          query: {
            $ttl: 0
          }
        }).then(() => {
          return people.get(1).then(data => {
            expect(data).to.be.ok
            expect(data.name).to.equal('John')

            return sleep(5000).then(() => {
              return people.get(1).then(data => {
                expect(data).to.be.ok
                expect(data.id).to.equal(1)
                expect(data.name).to.equal('John')
              })
            })
          })
        })
      })
    })
  })
})

describe('Common functionality', function () {
  this.slow(2000)

  it('is CommonJS compatible', () =>
    assert.strictEqual(typeof require('../lib'), 'function'))

  base(refs.app, errors, 'people')
  base(refs.app, errors, 'people-customid', 'customid')
})

describe('Feathers Cassandra service example test', function () {
  after(done => {
    server.close(() => done())
  })

  example()
})
