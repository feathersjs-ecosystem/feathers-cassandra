const { AdapterService } = require('@feathersjs/adapter-commons')
const errors = require('@feathersjs/errors')
const types = require('cassandra-driver').types
const flatten = require('arr-flatten')
const utils = require('./utils')
const errorHandler = require('./error-handler')

const METHODS = {
  $or: 'orWhere', // not supported
  $and: 'andWhere',
  $token: 'tokenWhere',
  $minTimeuuid: 'minTimeuuidWhere',
  $maxTimeuuid: 'maxTimeuuidWhere',
  $if: 'if',
  $ifExists: 'ifExists',
  $ifNotExists: 'ifNotExists',
  $add: 'add',
  $remove: 'remove',
  $increment: 'increment',
  $decrement: 'decrement'
}

const OPERATORS = {
  eq: '$eq',
  ne: '$ne', // applicable for IF conditions only
  gte: '$gte',
  gt: '$gt',
  lte: '$lte',
  lt: '$lt',
  in: '$in',
  notIn: '$nin', // not supported
  like: '$like', // applicable for SASI indexes only
  notLike: '$notLike', // not supported
  ilike: '$ilike', // not supported
  notILike: '$notILike', // not supported
  or: '$or', // not supported
  and: '$and'
}

const OPERATORS_MAP = {
  $eq: '=',
  $ne: '!=', // applicable for IF conditions only
  $isnt: 'IS NOT', // applicable for materialized view filters only
  $gt: '>',
  $lt: '<',
  $gte: '>=',
  $lte: '<=',
  $in: 'IN',
  $nin: 'NOT IN', // not supported
  $like: 'LIKE', // applicable for SASI indexes only
  $notLike: 'NOT LIKE', // not supported
  $iLike: 'ILIKE', // not supported
  $notILike: 'NOT ILIKE', // not supported
  $contains: 'CONTAINS', // applicable for indexed collections only
  $containsKey: 'CONTAINS KEY' // applicable for indexed maps only
}

/**
 * Class representing a feathers adapter for ExpressCassandra ORM & CassanKnex query builder.
 * @param {object} options
 * @param {string} [options.idSeparator=','] - id field primary keys separator char
 * @param {object} options.model - an ExpressCassandra model
 * @param {object} options.paginate
 * @param {object} options.events
 */
class Service extends AdapterService {
  constructor (options) {
    if (!options.model) {
      throw new errors.GeneralError('You must provide an ExpressCassandra Model')
    }

    const id = flatten(options.model._properties.schema.key)

    const whitelist = Object.values(OPERATORS).concat(options.whitelist || [])

    super(Object.assign({
      id: id.length === 1 ? id[0] : id,
      whitelist
    }, options))

    this.idSeparator = options.idSeparator || ','
    this.keyspace = options.model.get_keyspace_name()
    this.tableName = options.model.get_table_name()
    this.materializedViews = options.materializedViews || []
    this.modelOptions = options.model._properties.schema.options || {}
    this.fields = options.model._properties.schema.fields
    this.filters = options.model._properties.schema.filters || {}
  }

  get Model () {
    return this.options.model
  }

  getModel (params) {
    return this.options.model
  }

  filterQuery (params) {
    const filter = query => {
      Object.keys(query).forEach(key => {
        const value = query[key]

        if (key[0] !== '$' && this.fields[key] && utils.getFieldType(this.fields[key]) === 'boolean' && typeof value === 'string') {
          query[key] = (value !== '' && value !== '0' && value !== 'false')
        } else if (value instanceof types.Uuid || Buffer.isBuffer(value)) {
          query[key] = value.toString()
        } else if (Array.isArray(value)) {
          value.forEach((fieldValue, fieldKey) => {
            if (fieldValue instanceof types.Uuid || Buffer.isBuffer(fieldValue)) {
              query[key][fieldKey] = fieldValue.toString()
            }
          })
        } else if (utils.isPlainObject(value)) {
          return filter(value)
        }
      })
    }

    if (params.query) {
      filter(params.query)
    }

    return super.filterQuery(params)
  }

  /**
   * Create a new query that re-queries all ids that were originally changed
   * @param id
   * @param idList
   */
  getIdsQuery (id, idList) {
    const query = {}

    if (Array.isArray(this.id)) {
      let ids = id

      if (id && !Array.isArray(id)) {
        ids = utils.extractIds(id, this.id, this.idSeparator)
      }

      this.id.forEach((idKey, index) => {
        if (!ids) {
          if (idList) {
            if (idList[index]) {
              query[idKey] = idList[index].length === 1 ? idList[index] : { $in: idList[index] }
            }
          } else {
            query[idKey] = null
          }
        } else if (ids[index]) {
          query[idKey] = ids[index]
        } else {
          throw new errors.BadRequest('When using composite primary key, id must contain values for all primary keys')
        }
      })
    } else {
      query[`${this.id}`] = idList ? (idList.length === 1 ? idList[0] : { $in: idList }) : id
    }

    return query
  }

  /**
   * Maps a feathers query to the CassanKnex schema builder functions.
   * @param query - a query object. i.e. { type: 'fish', age: { $lte: 5 }
   * @param params
   * @param parentKey
   * @param methodKey
   */
  objectify (query, params, parentKey, methodKey) {
    if (params.$filters) { delete params.$filters }
    if (params.$allowFiltering) { delete params.$allowFiltering }
    if (!isNaN(params.$ttl)) { delete params.$ttl }
    if (params.$timestamp) { delete params.$timestamp }
    if (params.$noSelect) { delete params.$noSelect }
    if (params.$limitPerPartition) { delete params.$limitPerPartition }

    Object.keys(params || {}).forEach(key => {
      if (parentKey === '$token' && key === '$condition') { return }

      let value = params[key]

      if (utils.isPlainObject(value)) {
        return this.objectify(query, value, key, parentKey)
      }

      const column = parentKey && parentKey[0] !== '$' ? parentKey : key
      const method = METHODS[methodKey] || METHODS[parentKey] || METHODS[key]
      const operator = OPERATORS_MAP[key] || '='

      if (method) {
        if (!methodKey && (key === '$or' || key === '$and')) {
          value.forEach(condition => {
            this.objectify(query, condition, null, key)
          })

          return
        }

        if (parentKey === '$token') {
          return query.tokenWhere(params.$keys, OPERATORS_MAP[Object.keys(params.$condition)[0]], params.$condition[Object.keys(params.$condition)[0]])
        }

        if (method === METHODS.$or) { throw new errors.BadRequest('`$or` is not supported') }

        if (method === METHODS.$if && value === 'null') { value = null }

        return query[method].call(query, column, operator, value) // eslint-disable-line no-useless-call
      }

      if (operator === 'NOT IN') { throw new errors.BadRequest('`$nin` is not supported') }

      return query.where(column, operator, value)
    })
  }

  _createQuery (type) {
    let q = null

    if (!Service.cassanknex) {
      throw new errors.GeneralError('You must bind FeathersCassandra with an initialized CassanKnex object')
    }

    if (!type) { q = Service.cassanknex(this.keyspace).from(this.tableName) }
    if (type === 'create') { q = Service.cassanknex(this.keyspace).into(this.tableName) }
    if (type === 'update') { q = Service.cassanknex(this.keyspace).update(this.tableName) }
    if (type === 'delete') { q = Service.cassanknex(this.keyspace).delete().from(this.tableName) }

    return q
  }

  createQuery (filters, query) {
    let q = this._createQuery()

    // $select uses a specific find syntax, so it has to come first.
    if (filters.$select) {
      const fieldsToRemove = []

      for (const field of filters.$select) {
        const match = field && field.match(/(ttl|writetime|dateOf|unixTimestampOf|toDate|toTimestamp|toUnixTimestamp)\((.+)\)/)
        if (match) {
          const fieldMethod = match[1]
          const fieldName = match[2]

          q[fieldMethod]({ [fieldName]: `${fieldMethod}(${fieldName})` })
          fieldsToRemove.push(field)
        }
      }

      filters.$select = filters.$select.filter(val => !fieldsToRemove.includes(val))

      q = q.select(...filters.$select.concat(this.id))
    } else {
      q = q.select()
    }

    this.objectify(q, query)

    if (filters.$sort) {
      Object.keys(filters.$sort).forEach(key => {
        q = q.orderBy(key, filters.$sort[key] === 1 ? 'asc' : 'desc')
      })
    }

    return q
  }

  validate (data, type) {
    const model = new this.Model()
    const fields = type === 'patch' ? Object.keys(data) : Object.keys(this.fields)

    if (type === 'update') {
      if (Array.isArray(this.id)) {
        for (const idKey of this.id) {
          fields.splice(fields.indexOf(idKey), 1)
        }
      } else {
        fields.splice(fields.indexOf(this.id), 1)
      }
    }

    for (const field of fields) {
      let value = data[field]
      const fieldRule = utils.getFieldRule(this.fields[field])
      const fieldType = utils.getFieldType(this.fields[field])

      if (value === undefined || value === null) {
        if (fieldRule && fieldRule.required) { throw new errors.BadRequest(`\`${field}\` field is required`) }
      }

      let methodKey = null

      if (value && utils.isPlainObject(value) && METHODS[Object.keys(value)[0]]) {
        methodKey = Object.keys(value)[0]
      }

      if (!methodKey || methodKey !== '$remove' || fieldType !== 'map') {
        if (methodKey === '$increment' || methodKey === '$decrement') { value = Number(value) }

        let valueToValidate = methodKey ? value[methodKey] : value

        if (valueToValidate) {
          if (fieldType === 'timeuuid') {
            if (valueToValidate instanceof types.TimeUuid || valueToValidate.constructor.name === 'TimeUuid' || Buffer.isBuffer(valueToValidate)) {
              data[field] = valueToValidate.toString()
            } else {
              valueToValidate = types.TimeUuid.fromString(valueToValidate.toString())
            }

            if (valueToValidate instanceof types.TimeUuid) { // workaround for issue with express-cassandra validator when fromString is used
              continue
            }
          } else if (fieldType === 'uuid') {
            if (valueToValidate instanceof types.Uuid || valueToValidate.constructor.name === 'Uuid' || Buffer.isBuffer(valueToValidate)) {
              data[field] = valueToValidate.toString()
            } else {
              valueToValidate = types.Uuid.fromString(valueToValidate.toString())
            }

            if (valueToValidate instanceof types.Uuid) { // workaround for issue with express-cassandra validator when fromString is used
              continue
            }
          }
        }

        const validated = model.validate(field, valueToValidate)

        if (validated !== true) { throw new errors.BadRequest(validated(valueToValidate, field, fieldType)) }
      }
    }
  }

  /**
   * `find` service function for FeathersCassandra.
   * @param params
   */
  _find (params) {
    const find = (params, count, filters, query) => {
      let allowFiltering = false
      let filtersQueue = null
      const materializedView = utils.getMaterializedView(query, this.materializedViews)
      const q = this.createQuery(filters, query)

      if (materializedView) { q.from(materializedView) }

      if (params.query) {
        if (params.query.$allowFiltering) {
          allowFiltering = true
          q.allowFiltering()
          delete params.query.$allowFiltering
        }

        if (params.query.$filters) {
          filtersQueue = utils.runFilters(params, q, params.query.$filters, this.filters)
          delete params.query.$filters
        }

        if (params.query.$limitPerPartition) {
          q.limitPerPartition(params.query.$limitPerPartition)
          delete params.query.$limitPerPartition
        }
      }

      if (filters.$limit) {
        q.limit(filters.$limit)
      }

      let executeQuery = res => {
        const total = res ? Number(res.rows[0].count) : undefined

        return utils.exec(q, params)
          .then(res => {
            return {
              total,
              limit: filters.$limit,
              data: res.rows
            }
          })
      }

      if (filters.$limit === 0) {
        executeQuery = res => {
          const total = res ? Number(res.rows[0].count) : undefined

          return Promise.resolve({
            total,
            limit: filters.$limit,
            data: []
          })
        }
      }

      if (count) {
        const countQuery = this._createQuery()
          .select()
          .count('*')

        if (allowFiltering) { countQuery.allowFiltering() }

        if (filtersQueue) {
          for (const filter of filtersQueue) { filter(countQuery) }
        }

        this.objectify(countQuery, query)

        return utils.exec(countQuery, params)
          .then(res => {
            return executeQuery(res)
          })
          .catch(errorHandler)
      }

      return executeQuery().catch(errorHandler)
    }

    const { filters, query, paginate } = this.filterQuery(params)
    const result = find(params, Boolean(paginate && paginate.default), filters, query)

    if (!paginate || !paginate.default) {
      return result.then(page => page.data || page)
    }

    return result
  }

  _get (id, params) {
    const query = Object.assign({}, params.query, this.getIdsQuery(id))

    return this._find(Object.assign({}, params, { query }))
      .then(page => {
        const data = page.data || page

        if (data.length !== 1) {
          throw new errors.NotFound(`No record found for id '${id}'`)
        }

        return data[0]
      })
  }

  /**
   * `create` service function for FeathersCassandra.
   * @param {object} data
   * @param {object} params
   */
  _create (data, params) {
    const create = (data, params, hookOptions, batch = false) => {
      this.validate(data)
      utils.setTimestampFields(data, true, true, this.modelOptions.timestamps)
      utils.setVersionField(data, this.modelOptions.versions)

      const beforeHook = this.Model._properties.schema.before_save
      const afterHook = this.Model._properties.schema.after_save

      if (beforeHook && beforeHook(data, hookOptions) === false) { throw new errors.BadRequest('Error in before_save lifecycle function') }

      const q = this._createQuery('create')

      if (params.query) {
        if (params.query.$ifNotExists) {
          q.ifNotExists()
          delete params.query.$ifNotExists
        }

        if (!isNaN(params.query.$ttl)) {
          q.usingTTL(Number(params.query.$ttl))
          delete params.query.$ttl
        }

        if (params.query.$timestamp) {
          q.usingTimestamp(params.query.$timestamp)
          delete params.query.$timestamp
        }
      }

      if (batch) {
        return q.insert(data)
      }

      return utils.exec(q.insert(data), params)
        .then(row => {
          if (afterHook && afterHook(data, hookOptions) === false) { throw new errors.BadRequest('Error in after_save lifecycle function') }

          if (params.query && params.query.$noSelect) { return data }

          let id = null

          if (Array.isArray(this.id)) {
            id = []

            for (const idKey of this.id) {
              id.push(typeof data[idKey] !== 'undefined' ? data[idKey] : row[idKey])
            }
          } else {
            id = typeof data[this.id] !== 'undefined' ? data[this.id] : row[this.id]
          }

          return this._get(id, params)
        })
        .catch(errorHandler)
    }

    if (Array.isArray(data)) {
      const dataCopy = data.map(val => Object.assign({}, val))
      const query = this.filterQuery(params).query

      if (query.$batch) {
        const afterHook = this.Model._properties.schema.after_save
        const hookOptions = utils.getHookOptions(query)

        return utils.batch(Service.cassanknex, dataCopy.map(current => create(current, params, hookOptions, true)), params)
          .then(res => {
            dataCopy.forEach(item => {
              if (afterHook && afterHook(item, hookOptions) === false) { throw new errors.BadRequest('Error in after_save lifecycle function') }
            })

            return dataCopy
          })
          .catch(errorHandler)
      }

      return Promise.all(dataCopy.map(current => create(current, params)))
    }

    return create(Object.assign({}, data), params)
  }

  /**
   * `update` service function for FeathersCassandra.
   * @param id
   * @param data
   * @param params
   */
  _update (id, data, params) {
    const update = (id, data, params, oldData) => {
      const fields = Object.keys(oldData || this.fields)
      const createdAtField = this.modelOptions.timestamps && this.modelOptions.timestamps.createdAt
      let newObject = {}

      // Set missing fields to null
      for (const key of fields) {
        if (data[key] === undefined) {
          if (!createdAtField || key !== createdAtField) {
            newObject[key] = null
          }
        } else {
          newObject[key] = data[key]
        }
      }

      // Delete id field so we don't update it
      if (Array.isArray(this.id)) {
        for (const idKey of this.id) {
          delete newObject[idKey]
        }
      } else {
        delete newObject[this.id]
      }

      const q = this._createQuery('update')
      const idsQuery = this.getIdsQuery(id)

      if (params.query && !isNaN(params.query.$ttl)) {
        q.usingTTL(Number(params.query.$ttl))
        delete params.query.$ttl
      }

      if (params.query && params.query.$timestamp) {
        q.usingTimestamp(params.query.$timestamp)
        delete params.query.$timestamp
      }

      utils.prepareData(q, newObject, METHODS)

      q.set(newObject)

      Object.keys(idsQuery).forEach(key => {
        q.where(key, '=', idsQuery[key])
      })

      if (!oldData) {
        const query = this.filterQuery(params).query
        utils.prepareIfCondition(id, query, this.id)
        this.objectify(q, query)
      }

      return utils.exec(q, params)
        .then(() => {
          // Restore the createdAt field so we can return it to the client
          if (createdAtField && !newObject[createdAtField] && oldData) { newObject[createdAtField] = oldData[createdAtField] }

          // Restore the id field so we can return it to the client
          if (Array.isArray(this.id)) {
            newObject = Object.assign({}, newObject, this.getIdsQuery(id))
          } else {
            newObject[this.id] = id
          }

          if (oldData) {
            utils.prepareUpdateResult(data, oldData, newObject, this.fields)
          }

          if (params.query && params.query.$select) {
            const selectedFields = {}
            for (const field of params.query.$select) { selectedFields[field] = newObject[field] }

            return selectedFields
          }

          return newObject
        })
        .catch(errorHandler)
    }

    this.validate(data, 'update')
    utils.setTimestampFields(data, true, false, this.modelOptions.timestamps)
    utils.setVersionField(data, this.modelOptions.versions)

    const beforeHook = this.Model._properties.schema.before_update
    const afterHook = this.Model._properties.schema.after_update
    const hookOptions = utils.getHookOptions(params.query)

    if (beforeHook && beforeHook(params.query, data, hookOptions, id) === false) { throw new errors.BadRequest('Error in before_update lifecycle function') }

    if (params.query && params.query.$noSelect) {
      delete params.query.$noSelect

      return update(id, data, params)
        .then(data => {
          if (afterHook && afterHook(params.query, data, hookOptions, id) === false) { throw new errors.BadRequest('Error in after_update lifecycle function') }
          return data
        })
    }

    return this._get(id, params)
      .then(oldData => {
        return update(id, data, params, oldData)
          .then(data => {
            if (afterHook && afterHook(params.query, data, hookOptions, id) === false) { throw new errors.BadRequest('Error in after_update lifecycle function') }
            return data
          })
      })
  }

  /**
   * `patch` service function for FeathersCassandra.
   * @param id
   * @param data
   * @param params
   */
  _patch (id, data, params) {
    this.validate(data, 'patch')
    utils.setTimestampFields(data, true, false, this.modelOptions.timestamps)
    utils.setVersionField(data, this.modelOptions.versions)

    const beforeHook = this.Model._properties.schema.before_update
    const afterHook = this.Model._properties.schema.after_update
    const hookOptions = utils.getHookOptions(params.query)

    if (beforeHook && beforeHook(params.query, data, hookOptions, id) === false) { throw new errors.BadRequest('Error in before_update lifecycle function') }

    let { filters, query } = this.filterQuery(params)
    const dataCopy = Object.assign({}, data)

    const mapIds = page => Array.isArray(this.id)
      ? this.id.map(idKey => [...new Set((page.data || page).map(current => current[idKey]))])
      : (page.data || page).map(current => current[this.id])

    // By default we will just query for the one id. For multi patch
    // we create a list of the ids of all items that will be changed
    // to re-query them after the update
    const ids =
      id === null ? this._find(params).then(mapIds) : Promise.resolve([id])

    if (id !== null) {
      if (Array.isArray(this.id)) {
        query = Object.assign({}, query, this.getIdsQuery(id))
      } else {
        query[this.id] = id
      }
    }

    const q = this._createQuery('update')

    if (params.query) {
      if (!isNaN(params.query.$ttl)) {
        q.usingTTL(Number(params.query.$ttl))
        delete params.query.$ttl
      }

      if (params.query.$timestamp) {
        q.usingTimestamp(params.query.$timestamp)
        delete params.query.$timestamp
      }
    }

    utils.prepareIfCondition(id, query, this.id)
    this.objectify(q, query)

    if (Array.isArray(this.id)) {
      for (const idKey of this.id) {
        delete dataCopy[idKey]
      }
    } else {
      delete dataCopy[this.id]
    }

    return ids
      .then(idList => {
        // Create a new query that re-queries all ids that
        // were originally changed
        const selectParam = filters.$select ? { $select: filters.$select } : undefined
        const findParams = Object.assign({}, params, { query: Object.assign({}, this.getIdsQuery(id, idList), selectParam) })

        utils.prepareData(q, dataCopy, METHODS)

        q.set(dataCopy)

        return utils.exec(q, params)
          .then(() => {
            if (afterHook && afterHook(params.query, data, hookOptions, id) === false) { throw new errors.BadRequest('Error in after_update lifecycle function') }

            return params.query && params.query.$noSelect ? {} : this._find(findParams)
              .then(page => {
                const items = page.data || page

                if (id !== null) {
                  if (items.length === 1) {
                    return items[0]
                  } else {
                    throw new errors.NotFound(`No record found for id '${id}'`)
                  }
                } else if (!items.length) {
                  throw new errors.NotFound(`No record found for id '${id}'`)
                }

                return items
              })
          })
      })
      .catch(errorHandler)
  }

  /**
   * `remove` service function for FeathersCassandra.
   * @param id
   * @param params
   */
  _remove (id, params) {
    const beforeHook = this.Model._properties.schema.before_delete
    const afterHook = this.Model._properties.schema.after_delete
    const hookOptions = utils.getHookOptions(params.query)

    if (beforeHook && beforeHook(params.query, hookOptions, id) === false) { throw new errors.BadRequest('Error in before_delete lifecycle function') }

    params.query = Object.assign({}, params.query)

    // First fetch the record so that we can return
    // it when we delete it.
    if (id !== null) {
      if (Array.isArray(this.id)) {
        params.query = Object.assign({}, params.query, this.getIdsQuery(id))
      } else {
        params.query[this.id] = id
      }
    }

    const { query: queryParams } = this.filterQuery(params)
    const query = this._createQuery('delete')

    utils.prepareIfCondition(id, queryParams, this.id)
    this.objectify(query, queryParams)

    if (params.query && params.query.$noSelect) {
      return utils.exec(query, params)
        .then(() => {
          if (afterHook && afterHook(params.query, hookOptions, id) === false) { throw new errors.BadRequest('Error in after_delete lifecycle function') }
          return {}
        })
        .catch(errorHandler)
    } else {
      return this._find(params)
        .then(page => {
          const items = page.data || page

          return utils.exec(query, params)
            .then(() => {
              if (afterHook && afterHook(params.query, hookOptions, id) === false) { throw new errors.BadRequest('Error in after_delete lifecycle function') }

              if (id !== null) {
                if (items.length === 1) {
                  return items[0]
                } else {
                  throw new errors.NotFound(`No record found for id '${id}'`)
                }
              } else if (!items.length) {
                throw new errors.NotFound(`No record found for id '${id}'`)
              }

              return items
            })
        })
        .catch(errorHandler)
    }
  }
}

const init = options => {
  return new Service(options)
}

init.cassanknex = val => {
  Service.cassanknex = val
}

init.Service = Service

module.exports = init
