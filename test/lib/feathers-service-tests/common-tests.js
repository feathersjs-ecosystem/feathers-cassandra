'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true
})

var _typeof = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ? function (obj) { return typeof obj } : function (obj) { return obj && typeof Symbol === 'function' && obj.constructor === Symbol && obj !== Symbol.prototype ? 'symbol' : typeof obj }

var _chai = require('chai')

function _defineProperty (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    })
  } else { obj[key] = value }
  return obj
}

/* eslint-disable no-unused-expressions */

function common (appProxy, errors) {
  var serviceName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'people'
  var idProp = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'id'

  describe('Common tests, ' + serviceName + ' service with' + (' \'' + idProp + '\' id property'), function () {
    var _ids = {}
    var app = null

    before(function () {
      app = appProxy()
    })

    beforeEach(function () {
      return app.service(serviceName).create({
        [idProp]: 1,
        name: 'Doug',
        age: 32
      }).then(function (data) {
        return _ids.Doug = data[idProp]
      })
    })

    afterEach(function () {
      return app.service(serviceName).remove(_ids.Doug).catch(function () {})
    })

    it('sets `id` property on the service', function () {
      return (0, _chai.expect)(app.service(serviceName).id).to.equal(idProp)
    })

    it('sets `events` property from options', function () {
      return (0, _chai.expect)(app.service(serviceName).events.indexOf('testing')).to.not.equal(-1)
    })

    describe('extend', function () {
      it('extends and uses extended method', function () {
        var extended = app.service(serviceName).extend({
          create: function create (data) {
            data.age = 1
            return this._super.apply(this, arguments)
          }
        })

        return extended.create({ [idProp]: 2, name: 'Dave' }).then(function (data) {
          return extended.remove(data[idProp])
        }).then(function (data) {
          return (0, _chai.expect)(data.age).to.equal(1)
        })
      })
    })

    describe('get', function () {
      it('returns an instance that exists', function () {
        return app.service(serviceName).get(_ids.Doug).then(function (data) {
          (0, _chai.expect)(data[idProp].toString()).to.equal(_ids.Doug.toString());
          (0, _chai.expect)(data.name).to.equal('Doug');
          (0, _chai.expect)(data.age).to.equal(32)
        })
      })

      it('supports $select', function () {
        return app.service(serviceName).get(_ids.Doug, {
          query: { $select: ['name'] }
        }).then(function (data) {
          (0, _chai.expect)(data[idProp].toString()).to.equal(_ids.Doug.toString());
          (0, _chai.expect)(data.name).to.equal('Doug');
          (0, _chai.expect)(data.age).to.not.exist
        })
      })

      it('returns NotFound error for non-existing id', function () {
        return app.service(serviceName).get(999).catch(function (error) {
          (0, _chai.expect)(error instanceof errors.NotFound).to.be.ok;
          (0, _chai.expect)(error.message).to.equal('No record found for id \'999\'')
        })
      })
    })

    describe('remove', function () {
      it('deletes an existing instance and returns the deleted instance', function () {
        return app.service(serviceName).remove(_ids.Doug).then(function (data) {
          (0, _chai.expect)(data).to.be.ok;
          (0, _chai.expect)(data.name).to.equal('Doug')
        })
      })

      it('deletes an existing instance supports $select', function () {
        return app.service(serviceName).remove(_ids.Doug, {
          query: { $select: ['name'] }
        }).then(function (data) {
          (0, _chai.expect)(data).to.be.ok;
          (0, _chai.expect)(data.name).to.equal('Doug');
          (0, _chai.expect)(data.age).to.not.exist
        })
      })

      it('deletes multiple instances', function () {
        return app.service(serviceName).create({ [idProp]: 2, name: 'Dave', age: 29, created: true }).then(function () {
          return app.service(serviceName).create({
            [idProp]: 3,
            name: 'David',
            age: 3,
            created: true
          })
        }).then(function () {
          return app.service(serviceName).remove(null, {
            query: { [idProp]: { $in: [2, 3] } }
          })
        }).then(function (data) {
          (0, _chai.expect)(data.length).to.equal(2)

          var names = data.map(function (person) {
            return person.name
          });
          (0, _chai.expect)(names.indexOf('Dave')).to.be.above(-1);
          (0, _chai.expect)(names.indexOf('David')).to.be.above(-1)
        })
      })
    })

    describe('find', function () {
      beforeEach(function () {
        return app.service(serviceName).create({
          [idProp]: 2,
          name: 'Bob',
          age: 25
        }).then(function (bob) {
          _ids.Bob = bob[idProp]

          return app.service(serviceName).create({
            [idProp]: 3,
            name: 'Alice',
            age: 19
          })
        }).then(function (alice) {
          return _ids.Alice = alice[idProp]
        })
      })

      afterEach(function () {
        return app.service(serviceName).remove(_ids.Bob).then(function () {
          return app.service(serviceName).remove(_ids.Alice)
        })
      })

      it('returns all items', function () {
        return app.service(serviceName).find().then(function (data) {
          (0, _chai.expect)(data).to.be.instanceof(Array);
          (0, _chai.expect)(data.length).to.equal(3)
        })
      })

      it('filters results by a single parameter', function () {
        var params = { query: { name: 'Alice' } }

        return app.service(serviceName).find(params).then(function (data) {
          (0, _chai.expect)(data).to.be.instanceof(Array);
          (0, _chai.expect)(data.length).to.equal(1);
          (0, _chai.expect)(data[0].name).to.equal('Alice')
        })
      })

      it('filters results by multiple parameters', function () {
        var params = { query: { name: 'Alice', age: 19, $allowFiltering: true } }

        return app.service(serviceName).find(params).then(function (data) {
          (0, _chai.expect)(data).to.be.instanceof(Array);
          (0, _chai.expect)(data.length).to.equal(1);
          (0, _chai.expect)(data[0].name).to.equal('Alice')
        })
      })

      describe('special filters', function () {
        it('can $sort', function () {
          var params = {
            query: {
              [idProp]: {
                $in: Object.keys(_ids).map(key => _ids[key])
              },
              $sort: { age: 1 }
            }
          }

          return app.service(serviceName).find(params).then(function () {
            throw new Error('Should never get here')
          }).catch(function (error) {
            (0, _chai.expect)(error).to.be.ok;
            (0, _chai.expect)(error instanceof errors.BadRequest).to.be.ok;
            (0, _chai.expect)(error.message).to.equal('Order by is currently only supported on the clustered columns of the PRIMARY KEY, got age')
          })
        })

        it('can $sort with strings', function () {
          var params = {
            query: {
              [idProp]: {
                $in: Object.keys(_ids).map(key => _ids[key])
              },
              $sort: { age: '1' }
            }
          }

          return app.service(serviceName).find(params).then(function () {
            throw new Error('Should never get here')
          }).catch(function (error) {
            (0, _chai.expect)(error).to.be.ok;
            (0, _chai.expect)(error instanceof errors.BadRequest).to.be.ok;
            (0, _chai.expect)(error.message).to.equal('Order by is currently only supported on the clustered columns of the PRIMARY KEY, got age')
          })
        })

        it('can $limit', function () {
          var params = {
            query: {
              $limit: 2
            }
          }

          return app.service(serviceName).find(params).then(function (data) {
            return (0, _chai.expect)(data.length).to.equal(2)
          })
        })

        it('can $limit 0', function () {
          var params = {
            query: {
              $limit: 0
            }
          }

          return app.service(serviceName).find(params).then(function (data) {
            return (0, _chai.expect)(data.length).to.equal(0)
          })
        })

        it('can $select', function () {
          var params = {
            query: {
              name: 'Alice',
              $select: ['name']
            }
          }

          return app.service(serviceName).find(params).then(function (data) {
            (0, _chai.expect)(data.length).to.equal(1);
            (0, _chai.expect)(data[0].name).to.equal('Alice');
            (0, _chai.expect)(data[0].age).to.be.undefined
          })
        })

        it('can $or', function () {
          var params = {
            query: {
              $or: [{ name: 'Alice' }, { name: 'Bob' }]
            }
          }

          return app.service(serviceName).find(params).then(function (data) {
            throw new Error('Should never get here')
          }).catch(function (error) {
            (0, _chai.expect)(error).to.be.ok;
            (0, _chai.expect)(error instanceof errors.BadRequest).to.be.ok;
            (0, _chai.expect)(error.message).to.equal('`$or` is not supported')
          })
        })

        it('can $in', function () {
          var params = {
            query: {
              [idProp]: {
                $in: [2, 3]
              }
            }
          }

          return app.service(serviceName).find(params).then(function (data) {
            (0, _chai.expect)(data).to.be.instanceof(Array);
            (0, _chai.expect)(data.length).to.equal(2)
          })
        })

        it('can $nin', function () {
          var params = {
            query: {
              name: {
                $nin: ['Alice', 'Bob']
              }
            }
          }

          return app.service(serviceName).find(params).then(function () {
            throw new Error('Should never get here')
          }).catch(function (error) {
            (0, _chai.expect)(error).to.be.ok;
            (0, _chai.expect)(error instanceof errors.BadRequest).to.be.ok;
            (0, _chai.expect)(error.message).to.equal('`$nin` is not supported')
          })
        })

        it('can $lt', function () {
          var params = {
            query: {
              age: {
                $lt: 30
              },
              $allowFiltering: true
            }
          }

          return app.service(serviceName).find(params).then(function (data) {
            (0, _chai.expect)(data).to.be.instanceof(Array);
            (0, _chai.expect)(data.length).to.equal(2)
          })
        })

        it('can $lte', function () {
          var params = {
            query: {
              age: {
                $lte: 25
              },
              $allowFiltering: true
            }
          }

          return app.service(serviceName).find(params).then(function (data) {
            (0, _chai.expect)(data).to.be.instanceof(Array);
            (0, _chai.expect)(data.length).to.equal(2)
          })
        })

        it('can $gt', function () {
          var params = {
            query: {
              age: {
                $gt: 30
              },
              $allowFiltering: true
            }
          }

          return app.service(serviceName).find(params).then(function (data) {
            (0, _chai.expect)(data).to.be.instanceof(Array);
            (0, _chai.expect)(data.length).to.equal(1)
          })
        })

        it('can $gte', function () {
          var params = {
            query: {
              age: {
                $gte: 25
              },
              $allowFiltering: true
            }
          }

          return app.service(serviceName).find(params).then(function (data) {
            (0, _chai.expect)(data).to.be.instanceof(Array);
            (0, _chai.expect)(data.length).to.equal(2)
          })
        })
      })

      it('can $gt and $lt', function () {
        var params = {
          query: {
            age: {
              $gt: 18,
              $lt: 30
            }
          }
        }

        return app.service(serviceName).find(params).then(function (data) {
          (0, _chai.expect)(data.length).to.equal(2)
        })
      })

      it('can handle nested $and queries', function () {
        var params = {
          query: {
            $and: [{ name: 'Doug' }, {
              age: {
                $gte: 18,
              }
            }],
            $allowFiltering: true
          }
        }

        return app.service(serviceName).find(params).then(function (data) {
          (0, _chai.expect)(data.length).to.equal(1)
        })
      })

      describe('paginate', function () {
        beforeEach(function () {
          return app.service(serviceName).paginate = { default: 1, max: 2 }
        })

        afterEach(function () {
          return app.service(serviceName).paginate = {}
        })

        it('returns paginated object, paginates by default and shows total', function () {
          return app.service(serviceName).find().then(function (paginator) {
            (0, _chai.expect)(paginator.total).to.equal(3);
            (0, _chai.expect)(paginator.limit).to.equal(1)
          })
        })

        it('paginates max', function () {
          var params = {
            query: {
              $limit: 4
            }
          }

          return app.service(serviceName).find(params).then(function (paginator) {
            (0, _chai.expect)(paginator.total).to.equal(3);
            (0, _chai.expect)(paginator.limit).to.equal(2)
          })
        })

        it('$limit 0 with pagination', function () {
          return app.service(serviceName).find({ query: { $limit: 0 } }).then(function (paginator) {
            return (0, _chai.expect)(paginator.data.length).to.equal(0)
          })
        })

        it('allows to override paginate in params', function () {
          return app.service(serviceName).find({ paginate: { default: 2 } }).then(function (paginator) {
            (0, _chai.expect)(paginator.limit).to.equal(2)

            return app.service(serviceName).find({ paginate: false }).then(function (results) {
              return (0, _chai.expect)(results.length).to.equal(3)
            })
          })
        })
      })
    })

    describe('update', function () {
      it('replaces an existing instance, does not modify original data', function () {
        var _originalData

        var originalData = (_originalData = {}, _defineProperty(_originalData, idProp, _ids.Doug), _defineProperty(_originalData, 'name', 'Dougler'), _defineProperty(_originalData, 'age', 30), _originalData)
        var originalCopy = Object.assign({}, originalData)

        return app.service(serviceName).update(_ids.Doug, originalData).then(function (data) {
          (0, _chai.expect)(originalData).to.deep.equal(originalCopy);
          (0, _chai.expect)(data[idProp].toString()).to.equal(_ids.Doug.toString());
          (0, _chai.expect)(data.name).to.equal('Dougler');
          (0, _chai.expect)(data.age).to.be.ok
        })
      })

      it('replaces an existing instance, supports $select', function () {
        var _originalData2

        var originalData = (_originalData2 = {}, _defineProperty(_originalData2, idProp, _ids.Doug), _defineProperty(_originalData2, 'name', 'Dougler'), _defineProperty(_originalData2, 'age', 10), _originalData2)

        return app.service(serviceName).update(_ids.Doug, originalData, {
          query: { $select: ['name'] }
        }).then(function (data) {
          (0, _chai.expect)(data.name).to.equal('Dougler');
          (0, _chai.expect)(data.age).to.not.exist
        })
      })

      it('returns NotFound error for non-existing id', function () {
        return app.service(serviceName).update(999, { name: 'NotFound', age: 30 }).then(function () {
          throw new Error('Should never get here')
        }).catch(function (error) {
          (0, _chai.expect)(error).to.be.ok;
          (0, _chai.expect)(error instanceof errors.NotFound).to.be.ok;
          (0, _chai.expect)(error.message).to.equal('No record found for id \'999\'')
        })
      })
    })

    describe('patch', function () {
      it('updates an existing instance, does not modify original data', function () {
        var _originalData3

        var originalData = (_originalData3 = {}, _defineProperty(_originalData3, idProp, _ids.Doug), _defineProperty(_originalData3, 'name', 'PatchDoug'), _originalData3)
        var originalCopy = Object.assign({}, originalData)

        return app.service(serviceName).patch(_ids.Doug, originalData).then(function (data) {
          (0, _chai.expect)(originalData).to.deep.equal(originalCopy);
          (0, _chai.expect)(data[idProp].toString()).to.equal(_ids.Doug.toString());
          (0, _chai.expect)(data.name).to.equal('PatchDoug');
          (0, _chai.expect)(data.age).to.equal(32)
        })
      })

      it('updates an existing instance, supports $select', function () {
        var _originalData4

        var originalData = (_originalData4 = {}, _defineProperty(_originalData4, idProp, _ids.Doug), _defineProperty(_originalData4, 'name', 'PatchDoug'), _originalData4)

        return app.service(serviceName).patch(_ids.Doug, originalData, {
          query: { $select: ['name'] }
        }).then(function (data) {
          (0, _chai.expect)(data.name).to.equal('PatchDoug');
          (0, _chai.expect)(data.age).to.not.exist
        })
      })

      it('patches multiple instances', function () {
        var service = app.service(serviceName)
        var params = {
          query: { [idProp]: { $in: [2, 3] } }
        }

        return service.create({
          [idProp]: 2,
          name: 'Dave',
          age: 29,
          created: true
        }).then(function () {
          return service.create({
            [idProp]: 3,
            name: 'David',
            age: 3,
            created: true
          })
        }).then(function () {
          return service.patch(null, {
            age: 2
          }, params)
        }).then(function (data) {
          (0, _chai.expect)(data.length).to.equal(2);
          (0, _chai.expect)(data[0].age).to.equal(2);
          (0, _chai.expect)(data[1].age).to.equal(2)
        }).then(function () {
          return service.remove(null, params)
        })
      })

      it('patches multiple instances and returns the actually changed items', function () {
        var service = app.service(serviceName)
        var params = {
          query: { [idProp]: { $in: [2, 3] } }
        }

        return service.create({
          [idProp]: 2,
          name: 'Dave',
          age: 8,
          created: true
        }).then(function () {
          return service.create({
            [idProp]: 3,
            name: 'David',
            age: 4,
            created: true
          })
        }).then(function () {
          return service.patch(null, {
            age: 2
          }, params)
        }).then(function (data) {
          (0, _chai.expect)(data.length).to.equal(2);
          (0, _chai.expect)(data[0].age).to.equal(2);
          (0, _chai.expect)(data[1].age).to.equal(2)
        }).then(function () {
          return service.remove(null, params)
        })
      })

      it('patches multiple, returns correct items', function () {
        var service = app.service(serviceName)

        return service.create([{
          [idProp]: 2,
          name: 'Dave',
          age: 2,
          created: true
        }, {
          [idProp]: 3,
          name: 'David',
          age: 2,
          created: true
        }, {
          [idProp]: 4,
          name: 'D',
          age: 8,
          created: true
        }]).then(function () {
          return service.patch(null, {
            age: 8
          }, {
            query: {
              [idProp]: { $in: [2, 3] }
            }
          })
        }).then(function (data) {
          (0, _chai.expect)(data.length).to.equal(2);
          (0, _chai.expect)(data[0].age).to.equal(8);
          (0, _chai.expect)(data[1].age).to.equal(8)
        }).then(function () {
          return service.remove(null, {
            query: { [idProp]: { $in: [2, 3, 4] } }
          })
        })
      })

      describe('$if & $ifExists', function () {
        beforeEach(function () {
          return app.service(serviceName).create({
            [idProp]: 2,
            name: 'Dave',
            age: 32
          }).then(function (data) {
            _ids.Dave = data[idProp]
            return app.service(serviceName).remove(999).catch(function () {})
          })
        })

        afterEach(function () {
          return app.service(serviceName).remove(_ids.Dave).then(function () {
            return app.service(serviceName).remove(999).catch(function () {})
          })
        })

        it('can $if true', function () {
          var params = {
            query: {
              [idProp]: 2,
              $if: {
                name: 'Dave'
              }
            }
          }

          return app.service(serviceName).patch(null, { [idProp]: 2, name: 'John' }, params).then(function (data) {
            (0, _chai.expect)(data).to.be.instanceof(Array);
            (0, _chai.expect)(data.length).to.equal(1);
            (0, _chai.expect)(data[0].name).to.equal('John')
          })
        })

        it('can $if no rows match', function () {
          var params = {
            query: {
              [idProp]: 999,
              $if: {
                name: 'Dave'
              }
            }
          }

          return app.service(serviceName).patch(null, { [idProp]: 2, name: 'John' }, params).then(function (data) {
            (0, _chai.expect)(data).to.be.instanceof(Array);
            (0, _chai.expect)(data).to.be.empty
          })
        })

        it('can $if false and $ne', function () {
          var params = {
            query: {
              [idProp]: 2,
              $if: {
                name: {
                  $ne: 'Dave'
                }
              }
            }
          }

          return app.service(serviceName).patch(null, { [idProp]: 2, name: 'John' }, params).then(function (data) {
            (0, _chai.expect)(data).to.be.instanceof(Array);
            (0, _chai.expect)(data.length).to.equal(1);
            (0, _chai.expect)(data[0].name).to.equal('Dave')
          })
        })

        it('can $ifExists true', function () {
          var params = {
            query: {
              [idProp]: 2,
              $ifExists: true
            }
          }

          return app.service(serviceName).patch(null, { [idProp]: 2, name: 'John' }, params).then(function (data) {
            (0, _chai.expect)(data).to.be.instanceof(Array);
            (0, _chai.expect)(data.length).to.equal(1);
            (0, _chai.expect)(data[0].name).to.equal('John')
          })
        })

        it('can $ifExists no matching rows', function () {
          var params = {
            query: {
              [idProp]: 999,
              $ifExists: true
            }
          }

          return app.service(serviceName).patch(null, { [idProp]: 999, name: 'John' }, params).then(function (data) {
            (0, _chai.expect)(data).to.be.instanceof(Array);
            (0, _chai.expect)(data).to.be.empty
          })
        })
      })
    })

    describe('create', function () {
      it('creates a single new instance and returns the created instance', function () {
        var originalData = {
          [idProp]: 2,
          name: 'Bill',
          age: 40
        }
        var originalCopy = Object.assign({}, originalData)

        return app.service(serviceName).create(originalData).then(function (data) {
          (0, _chai.expect)(originalData).to.deep.equal(originalCopy);
          (0, _chai.expect)(data).to.be.instanceof(Object);
          (0, _chai.expect)(data).to.not.be.empty;
          (0, _chai.expect)(data.name).to.equal('Bill')
        })
      })

      it('creates a single new instance, supports $select', function () {
        var originalData = {
          [idProp]: 2,
          name: 'William',
          age: 23
        }

        return app.service(serviceName).create(originalData, {
          query: { $select: ['name'] }
        }).then(function (data) {
          (0, _chai.expect)(data.name).to.equal('William');
          (0, _chai.expect)(data.age).to.not.exist
        })
      })

      it('creates multiple new instances', function () {
        var items = [{
          [idProp]: 2,
          name: 'Gerald',
          age: 18
        }, {
          [idProp]: 3,
          name: 'Herald',
          age: 18
        }]

        return app.service(serviceName).create(items).then(function (data) {
          (0, _chai.expect)(data).to.not.be.empty;
          (0, _chai.expect)(Array.isArray(data)).to.equal(true);
          (0, _chai.expect)(_typeof(data[0][idProp])).to.not.equal('undefined');
          (0, _chai.expect)(data[0].name).to.equal('Gerald');
          (0, _chai.expect)(_typeof(data[1][idProp])).to.not.equal('undefined');
          (0, _chai.expect)(data[1].name).to.equal('Herald')
        })
      })

      describe('$ifNotExists', function () {
        beforeEach(function () {
          return app.service(serviceName).remove(999).catch(function () {})
        })

        afterEach(function () {
          return app.service(serviceName).remove(999).catch(function () {})
        })

        it('can $ifNotExists true', function () {
          var params = {
            query: {
              $ifNotExists: true
            }
          }

          return app.service(serviceName).create({ [idProp]: 999, name: 'John', age: 32 }, params).then(function (data) {
            (0, _chai.expect)(data.name).to.equal('John')
          }).catch(function () {})
        })

        it('can $ifNotExists false', function () {
          var params = {
            query: {
              $ifNotExists: true
            }
          }

          return app.service(serviceName).create({ [idProp]: 1, name: 'Dave', age: 32 }, params).then(function (data) {
            (0, _chai.expect)(data.name).to.equal('Doug')
          })
        })
      })
    })

    describe('Services don\'t call public methods internally', function () {
      var throwing = void 0

      before(function () {
        throwing = app.service(serviceName).extend({
          get store () {
            return app.service(serviceName).store
          },

          find: function find () {
            throw new Error('find method called')
          },
          get: function get () {
            throw new Error('get method called')
          },
          create: function create () {
            throw new Error('create method called')
          },
          update: function update () {
            throw new Error('update method called')
          },
          patch: function patch () {
            throw new Error('patch method called')
          },
          remove: function remove () {
            throw new Error('remove method called')
          }
        })
      })

      it('find', function () {
        return app.service(serviceName).find.call(throwing)
      })

      it('get', function () {
        return app.service(serviceName).get.call(throwing, _ids.Doug)
      })

      it('create', function () {
        return app.service(serviceName).create.call(throwing, {
          [idProp]: 2,
          name: 'Bob',
          age: 25
        })
      })

      it('update', function () {
        return app.service(serviceName).update.call(throwing, _ids.Doug, {
          name: 'Dougler',
          age: 30
        })
      })

      it('patch', function () {
        return app.service(serviceName).patch.call(throwing, _ids.Doug, {
          name: 'PatchDoug'
        })
      })

      it('remove', function () {
        return app.service(serviceName).remove.call(throwing, _ids.Doug)
      })
    })
  })
}

exports.default = common
module.exports = exports['default']
