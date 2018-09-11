/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const {expect} = require('chai')
const {app, cassandraClient, people, peopleMv, peopleRooms, peopleRoomsCustomIdSeparator} = require('./prepare')
const assert = require('assert')
const {base, example} = require('./lib/feathers-service-tests')
const errors = require('@feathersjs/errors')
const sleep = require('await-sleep')
const server = require('../example/app')
const service = require('../src')

describe('Feathers Cassandra service', () => {
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

    describe('when missing the id option', () => {
      it('sets the default to be id', () => {
        expect(people().id).to.equal('id')
      })
    })

    describe('when missing the paginate option', () => {
      it('sets the default to be {}', () => {
        expect(people().paginate).to.deep.equal({})
      })
    })

    describe('when missing namedFilters', () => {
      it('sets the default to be {}', () => {
        expect(peopleRooms().namedFilters).to.deep.equal({})
      })
    })
  })

  describe('Common functionality', () => {
    it('is CommonJS compatible', () =>
      assert.equal(typeof require('../lib'), 'function'))

    base(app(), errors, 'people')
    base(app(), errors, 'people-customid', 'customid')
  })

  describe('Composite PK queries', () => {
    beforeEach(async () => {
      await peopleRooms()
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
          }
        ])

      await peopleRoomsCustomIdSeparator()
        .patch([1, 2], {
          days: {
            $increment: 1
          }
        })

      await peopleRoomsCustomIdSeparator()
        .patch([2, 2], {
          days: {
            $increment: 2
          }
        })
    })

    afterEach(async () => {
      await peopleRooms().remove([1, 1, 1])
      await peopleRooms().remove([1, 2, 2])

      try {
        await peopleRooms().remove([2, 2, 3])
      } catch (err) {}

      await peopleRoomsCustomIdSeparator().remove([1, 2])
      await peopleRoomsCustomIdSeparator().remove([2, 2])
    })

    it('allows get queries', () => {
      return peopleRooms().get([2, 2, 3]).then(data => {
        expect(data.people_id).to.equal(2)
        expect(data.room_id).to.equal(2)
        expect(data.admin).to.equal(true)
      })
    })

    it('allows get queries by object', () => {
      return peopleRooms().get({people_id: 2, room_id: 2, time: 3}).then(data => {
        expect(data.people_id).to.equal(2)
      })
    })

    it('allows get queries by separator', () => {
      return peopleRooms().get('2,2,3').then(data => {
        expect(data.people_id).to.equal(2)
      })
    })

    it('allows get queries by custom separator', () => {
      return peopleRoomsCustomIdSeparator().get('2.2').then(data => {
        expect(data.people_id).to.equal(2)
      })
    })

    it('allows find queries', () => {
      return peopleRooms().find({query: {room_id: 2, $allowFiltering: true}}).then(data => {
        expect(data.length).to.equal(2)
        expect(data[0].people_id).to.equal(2)
        expect(data[1].people_id).to.equal(1)
      })
    })

    it('allows find with $token queries', () => {
      return peopleRooms().find({
        query: {
          $token: {
            $keys: ['people_id', 'room_id'],
            $condition: {$gt: [1, 2]}
          }
        }
      }).then(data => {
        expect(data.length).to.equal(1)
        expect(data[0].people_id).to.equal(1)
        expect(data[0].room_id).to.equal(1)
      })
    })

    it('allows patch queries', () => {
      return peopleRooms().patch([2, 2, 3], {people_id: 1, admin: false}).then(data => {
        expect(data.people_id).to.equal(2)
        expect(data.admin).to.equal(false)
      })
    })

    it('allows update queries', () => {
      return peopleRooms().update([2, 2, 3], {people_id: 1, admin: false}).then(data => {
        expect(data.people_id).to.equal(2)
        expect(data.admin).to.equal(false)
      })
    })

    it('allows remove queries', () => {
      return peopleRooms().remove([2, 2, 3]).then(() => {
        return peopleRooms().find().then(data => {
          expect(data.length).to.equal(2)
        })
      })
    })
  })

  describe('$noSelect', () => {
    beforeEach(async () => {
      await people()
        .create({
          id: 1,
          name: 'Dave',
          age: 10,
          created: true
        })
    })

    it('create with $noSelect', () => {
      return people().create({
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
      return people().patch(1, {name: 'John'}, {query: {$noSelect: true}}).then(data => {
        expect(data).to.be.ok
        expect(data).to.be.empty
      })
    })

    it('update with $noSelect', () => {
      return people().update(1, {name: 'John', age: 10}, {query: {$noSelect: true}}).then(data => {
        expect(data).to.be.ok
        expect(data.name).to.equal('John')
        expect(data.created).to.equal(null)
      })
    })

    it('remove with $noSelect', () => {
      return people().remove(1, {
        query: {
          $noSelect: true
        }
      }).then(data => {
        expect(data).to.be.ok
        expect(data).to.be.empty
      })
    })
  })

  describe('$like method', () => {
    beforeEach(async () => {
      await people()
        .create({
          id: 1,
          name: 'Charlie Brown',
          age: 10
        })
    })

    it('$like in query', () => {
      return people().find({query: {name: {$like: '%lie%'}}}).then(data => {
        expect(data[0].name).to.equal('Charlie Brown')
      })
    })
  })

  describe('$and method', () => {
    beforeEach(async () => {
      await people()
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

    it('$and in query', () => {
      return people().find({query: {$and: [{name: 'Dave'}, {age: {$lt: 32}}], $allowFiltering: true}}).then(data => {
        expect(data[0].age).to.equal(23)
      })
    })
  })

  describe('$or method', () => {
    beforeEach(async () => {
      await people()
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

    it('$or in query', () => {
      return people().find({query: {$or: [{name: 'John'}, {name: 'Dada'}]}}).then(() => {
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
      await people()
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

    it('$token $gt query', () => {
      return people().find({
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
        await people().remove(1)
      } catch (err) {}
    })

    afterEach(async () => {
      try {
        await people().remove(1)
      } catch (err) {}
    })

    it('can validate create data', () => {
      return people().create({id: 1, name: 'forbidden', age: 30}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`forbidden` is a reserved word')
      })
    })

    it('can validate create data required fields', () => {
      return people().create({id: 1, name: 'John'}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate create data required fields with undefined', () => {
      return people().create({id: 1, name: 'John', age: undefined}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate create data required fields with null', () => {
      return people().create({id: 1, name: 'John', age: null}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can pass validate create data', () => {
      return people().create({id: 1, name: 'John', age: 30}).then(data => {
        expect(data.name).to.equal('John')
      })
    })

    it('can validate multiple create data', () => {
      return people().create([{id: 1, name: 'forbidden', age: 30}]).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`forbidden` is a reserved word')
      })
    })

    it('can validate multiple create data required fields', () => {
      return people().create([{id: 1, name: 'John'}]).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate multiple create data required fields with undefined', () => {
      return people().create([{id: 1, name: 'John', age: undefined}]).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate multiple create data required fields with null', () => {
      return people().create([{id: 1, name: 'John', age: null}]).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can pass validate multiple create data', () => {
      return people().create([{id: 1, name: 'John', age: 30}]).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].name).to.equal('John')
      })
    })

    it('can validate update data', () => {
      return people().update(1, {name: 'forbidden', age: 30}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`forbidden` is a reserved word')
      })
    })

    it('can validate update data required fields', () => {
      return people().update(1, {name: 'John'}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate update data required fields with undefined', () => {
      return people().update(1, {name: 'John', age: null}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate update data required fields with null', () => {
      return people().update(1, {name: 'John', age: null}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can pass validate update data', () => {
      return people().create({id: 1, name: 'Dave', age: 30}).then(() => {
        return people().update(1, {name: 'John', age: 30}).then(data => {
          expect(data.name).to.equal('John')
        })
      })
    })

    it('can validate patch data', () => {
      return people().patch(1, {name: 'forbidden'}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`forbidden` is a reserved word')
      })
    })

    it('can validate patch data required fields with undefined', () => {
      return people().patch(1, {name: 'John', age: undefined}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can validate patch data required fields with null', () => {
      return people().patch(1, {name: 'John', age: null}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`age` field is required')
      })
    })

    it('can pass validate patch data', () => {
      return people().patch(1, {name: 'John'}).then(data => {
        expect(data.name).to.equal('John')
      })
    })

    it('can validate multiple patch data', () => {
      return people().patch(null, {name: 'forbidden'}, {query: {id: 1}}).then(() => {
        throw new Error('Should never get here')
      }).catch(function (error) {
        expect(error).to.be.ok
        expect(error.name).to.equal('BadRequest')
        expect(error.message).to.equal('`forbidden` is a reserved word')
      })
    })

    it('can pass validate multiple patch data', () => {
      return people().create({id: 1, name: 'Dave', age: 30}).then(() => {
        return people().patch(null, {name: 'John'}, {query: {id: 1}}).then(data => {
          expect(data).to.be.instanceof(Array)
          expect(data.length).to.equal(1)
          expect(data[0].name).to.equal('John')
        })
      })
    })
  })

  describe('named filters', () => {
    beforeEach(async () => {
      await people()
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

    it('can query with named filter', () => {
      return people().find({query: {$filters: 'old'}}).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].name).to.equal('John')
      })
    })
  })

  describe('materialized views', () => {
    beforeEach(async () => {
      await peopleMv()
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
      return peopleMv().find({query: {name: 'Dada'}}).then(data => {
        expect(data).to.be.instanceof(Array)
        expect(data.length).to.equal(1)
        expect(data[0].name).to.equal('Dada')
      })
    })
  })

  describe('$ttl', () => {
    beforeEach(async () => {
      await people()
        .create({
          id: 1,
          name: 'Dave',
          age: 10
        })
    })

    it('create with $ttl', () => {
      return people().create({
        id: 2,
        name: 'John',
        age: 10
      }, {
        query: {
          $ttl: 4
        }
      }).then(() => {
        return people().get(2).then(data => {
          expect(data).to.be.ok
          expect(data.name).to.equal('John')

          return sleep(5000).then(() => {
            return people().get(2).then(() => {
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
      return people().patch(1, {
        name: 'John'
      }, {
        query: {
          $ttl: 4
        }
      }).then(() => {
        return people().get(1).then(data => {
          expect(data).to.be.ok
          expect(data.name).to.equal('John')

          return sleep(5000).then(() => {
            return people().get(1).then(data => {
              expect(data).to.be.ok
              expect(data.id).to.equal(1)
              expect(data.name).to.equal(null)
            })
          })
        })
      })
    })

    it('update with $ttl', () => {
      return people().update(1, {
        name: 'John',
        age: 10
      }, {
        query: {
          $ttl: 4
        }
      }).then(() => {
        return people().get(1).then(data => {
          expect(data).to.be.ok
          expect(data.name).to.equal('John')

          return sleep(5000).then(() => {
            return people().get(1).then(data => {
              expect(data).to.be.ok
              expect(data.id).to.equal(1)
              expect(data.name).to.equal(null)
            })
          })
        })
      })
    })

    it('update with $ttl 0', () => {
      return people().update(1, {
        name: 'John',
        age: 10
      }, {
        query: {
          $ttl: 4
        }
      }).then(() => {
        return people().update(1, {
          name: 'John',
          age: 10
        }, {
          query: {
            $ttl: 0
          }
        }).then(() => {
          return people().get(1).then(data => {
            expect(data).to.be.ok
            expect(data.name).to.equal('John')

            return sleep(5000).then(() => {
              return people().get(1).then(data => {
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

  describe('$timestamp', () => {
    beforeEach(async () => {
      await people()
        .create({
          id: 5,
          name: 'Dave',
          age: 10
        })
    })

    afterEach(async () => {
      try {
        await people().remove(5)
        await people().remove(6)
      } catch (err) {}
    })

    it('create with $timestamp', () => {
      const timestamp = (Date.now() - 1000) * 1000

      return people().create({
        id: 6,
        name: 'John',
        age: 10
      }, {
        query: {
          $timestamp: timestamp
        }
      }).then(() => {
        return cassandraClient().execute('SELECT WRITETIME(name) as writetime FROM test.people WHERE id = 6')
          .then(result => {
            expect(result.rows[0].writetime.toString()).to.equal(timestamp.toString())
          })
      })
    })

    it('create with $timestamp & $ttl', () => {
      const timestamp = Date.now() * 1000

      return people().create({
        id: 6,
        name: 'John',
        age: 10
      }, {
        query: {
          $timestamp: timestamp,
          $ttl: 4
        }
      }).then(() => {
        return cassandraClient().execute('SELECT WRITETIME(name) as writetime FROM test.people WHERE id = 6')
          .then(result => {
            expect(result.rows[0].writetime.toString()).to.equal(timestamp.toString())

            return sleep(5000).then(() => {
              return people().get(6).then(() => {
                throw new Error('Should never get here')
              }).catch(function (error) {
                expect(error).to.be.ok
                expect(error instanceof errors.NotFound).to.be.ok
              })
            })
          })
      })
    })

    it('patch with $timestamp', () => {
      const timestamp = Date.now() * 1000

      return people().patch(5, {
        name: 'John',
        age: 10
      }, {
        query: {
          $timestamp: timestamp
        }
      }).then(() => {
        return cassandraClient().execute('SELECT WRITETIME(name) as writetime FROM test.people WHERE id = 5')
          .then(result => {
            expect(result.rows[0].writetime.toString()).to.equal(timestamp.toString())
          })
      })
    })

    it('update with $timestamp', () => {
      const timestamp = (Date.now() * 1000).toString()

      return people().update(5, {
        name: 'John',
        age: 10
      }, {
        query: {
          $timestamp: timestamp
        }
      }).then(() => {
        return cassandraClient().execute('SELECT WRITETIME(name) as writetime FROM test.people WHERE id = 5')
          .then(result => {
            expect(result.rows[0].writetime.toString()).to.equal(timestamp)
          })
      })
    })
  })
})

describe('Feathers Cassandra service example test', () => {
  after(done => {
    server.close(() => done())
  })

  example()
})
