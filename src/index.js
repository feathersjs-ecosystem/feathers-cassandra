const Proto = require('uberproto')
const types = require('cassandra-driver').types
const { filterQuery: filterQueryCommon } = require('@feathersjs/commons')
const errors = require('@feathersjs/errors')
const flatten = require('arr-flatten')
const isPlainObject = require('is-plain-object')
const _isEqual = require('lodash.isequal')
const errorHandler = require('./error-handler')

const METHODS = {
  $or: 'orWhere', // not supported
  $and: 'andWhere',
  $token: 'tokenWhere',
  $if: 'if',
  $ifExists: 'ifExists',
  $ifNotExists: 'ifNotExists',
  $add: 'add',
  $remove: 'remove',
  $increment: 'increment',
  $decrement: 'decrement'
}

const QUERY_OPERATORS = [
  '$eq',
  '$ne', // applicable for IF conditions only
  '$isnt', // applicable for materialized view filters only
  '$gt',
  '$lt',
  '$gte',
  '$lte',
  '$in',
  '$nin', // not supported
  '$like', // applicable for SASI indexes only
  '$token', // applicable for token queries only
  '$keys', // applicable for token queries only
  '$condition', // applicable for token queries only
  '$contains', // applicable for indexed collections only
  '$containsKey', // applicable for indexed maps only
  '$or', // not supported
  '$and',
  '$if',
  '$ifExists',
  '$ifNotExists',
  '$allowFiltering',
  '$filters',
  '$limitPerPartition'
]

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
  $like: 'LIKE', // applicable for sasi indexes only
  $contains: 'CONTAINS', // applicable for indexed collections only
  $containsKey: 'CONTAINS KEY' // applicable for indexed maps only
}

/**
 * Class representing a feathers adapter for ExpressCassandra ORM & CassanKnex query builder.
 * @param {object} options
 * @param {string} [options.id='id'] - database id field
 * @param {string} [options.idSeparator=','] - id field primary keys separator char
 * @param {object} options.model - an ExpressCassandra model
 * @param {object} options.paginate
 * @param {object} options.events
 */
class Service {
  constructor (options) {
    if (!options) {
      throw new errors.GeneralError('FeathersCassandra options have to be provided')
    }

    if (!options.model) {
      throw new errors.GeneralError('You must provide an ExpressCassandra Model')
    }

    const id = flatten(options.model._properties.schema.key)

    this.options = options
    this.id = id.length === 1 ? id[0] : id
    this.keyspace = options.model.get_keyspace_name()
    this.tableName = options.model.get_table_name()
    this.idSeparator = options.idSeparator || ','
    this.paginate = options.paginate || {}
    this.events = options.events || []
    this.materializedViews = options.materializedViews || []
    this.Model = options.model
    this.modelOptions = this.Model._properties.schema.options || {}
    this.filters = options.model._properties.schema.filters || {}
  }

  extend (obj) {
    return Proto.extend(obj, this)
  }

  extractIds (id) {
    if (typeof id === 'object') { return this.id.map(idKey => id[idKey]) }
    if (id[0] === '[' && id[id.length - 1] === ']') { return JSON.parse(id) }
    if (id[0] === '{' && id[id.length - 1] === '}') {
      const obj = JSON.parse(id)
      return Object.keys(obj).map(key => obj[key])
    }

    if (typeof id !== 'string' || !id.includes(this.idSeparator)) { throw new errors.BadRequest('When using composite primary key, id must contain values for all primary keys') }

    return id.split(this.idSeparator)
  }

  // Create a new query that re-queries all ids that were originally changed
  getIdsQuery (id, idList) {
    const query = {}

    if (Array.isArray(this.id)) {
      let ids = id

      if (id && !Array.isArray(id)) {
        ids = this.extractIds(id)
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

  runFilters (params, query, filtersExpression) {
    const filters = []
    const filtersNames = filtersExpression.replace(/[^a-zA-Z0-9_,]/g, '').split(',')

    for (const name of filtersNames) {
      if (name && this.filters[name]) { filters.push(this.filters[name]) }
    }

    for (const filter of filters) { filter(query) }

    return filters
  }

  getMaterializedView (query, materializedViews) {
    let keys = Object.keys(query)

    if (materializedViews.length > 0 && keys.length > 0) {
      for (const mv of materializedViews) {
        if (_isEqual(mv.keys.sort(), keys.sort())) { return mv.view }
      }
    }

    return null
  }

  prepareData (query, data) {
    for (const field of Object.keys(data)) {
      const value = data[field]
      let removeKey = false

      if (isPlainObject(value)) {
        const key = Object.keys(value)[0]
        const fieldValue = value[key]

        if (key === '$add' || key === '$remove' || key === '$increment' || key === '$decrement') {
          query[METHODS[key]](field, key === '$add' && Array.isArray(fieldValue) ? [fieldValue] : fieldValue)
          removeKey = true
        }
      }

      if (removeKey) {
        delete data[field]
      }
    }
  }

  setTimestampFields (data, updatedAt, createdAt) {
    const timestamps = this.modelOptions.timestamps

    if (timestamps) {
      const now = new Date().toISOString()
      const createdAtFieldName = 'createdAt'
      const updatedAtFieldName = 'updatedAt'

      if (createdAt && timestamps.createdAt) {
        data[typeof timestamps.createdAt === 'string' ? timestamps.createdAt : createdAtFieldName] = now
      }
      if (updatedAt && timestamps.updatedAt) {
        data[typeof timestamps.updatedAt === 'string' ? timestamps.updatedAt : updatedAtFieldName] = now
      }
    }
  }

  setVersionField (data) {
    const versions = this.modelOptions.versions

    if (versions) {
      const timeuuidVersion = types.TimeUuid.now()
      const versionFieldName = '__v'

      data[typeof versions.key === 'string' ? versions.key : versionFieldName] = timeuuidVersion
    }
  }

  getHookOptions (query = {}) {
    const options = {}

    Object.keys(query).forEach(key => {
      if (key[0] === '$') {
        const optionName = key.substr(1).replace(/([A-Z])/g, (match, p1) => '_' + p1.toLowerCase())
        options[optionName] = query[key]
      }
    })

    return options
  }

  filterQuery (query, options = {}) {
    const filter = query => {
      Object.keys(query).forEach(key => {
        const value = query[key]

        if (value instanceof types.Uuid || Buffer.isBuffer(value)) {
          query[key] = value.toString()
        } else if (Array.isArray(value)) {
          value.forEach((fieldValue, fieldKey) => {
            if (fieldValue instanceof types.Uuid || Buffer.isBuffer(fieldValue)) {
              query[key][fieldKey] = fieldValue.toString()
            }
          })
        } else if (isPlainObject(value)) {
          return filter(value)
        }
      })
    }

    filter(query)

    return filterQueryCommon(query, options)
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
    if (params.$ttl) { delete params.$ttl }
    if (params.$timestamp) { delete params.$timestamp }
    if (params.$noSelect) { delete params.$noSelect }
    if (params.$limitPerPartition) { delete params.$limitPerPartition }

    Object.keys(params || {}).forEach(key => {
      if (parentKey === '$token' && key === '$condition') { return }

      let value = params[key]

      if (isPlainObject(value)) {
        return this.objectify(query, value, key, parentKey)
      }

      const column = parentKey && parentKey[0] !== '$' ? parentKey : key
      const method = METHODS[methodKey || parentKey || key]
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

        if (method === METHODS['$or']) { throw new errors.BadRequest(`\`$or\` is not supported`) }

        if (value === 'null') { value = null }

        return query[method].call(query, column, operator, value) // eslint-disable-line no-useless-call
      }

      if (operator === 'NOT IN') { throw new errors.BadRequest(`\`$nin\` is not supported`) }

      if (value === 'null') { value = null }

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
        const ttlMatch = field.match(/ttl\((.+)\)/i)
        const writetimeMatch = field.match(/writetime\((.+)\)/i)

        if (ttlMatch) {
          const fieldName = ttlMatch[1]
          q.ttl({ [fieldName]: fieldName + '_ttl' })
          fieldsToRemove.push(field)
        } else if (writetimeMatch) {
          const fieldName = writetimeMatch[1]
          q.writetime({ [fieldName]: fieldName + '_writetime' })
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
    const modelFields = this.Model._properties.schema.fields
    const fields = type === 'patch' ? Object.keys(data) : Object.keys(modelFields)

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
      const fieldRule = isPlainObject(modelFields[field]) ? modelFields[field].rule : null
      const fieldType = isPlainObject(modelFields[field]) ? modelFields[field].type : modelFields[field]

      if (value === undefined || value === null) {
        if (fieldRule && fieldRule.required) { throw new errors.BadRequest(`\`${field}\` field is required`) }
      }

      let methodKey = null

      if (value && isPlainObject(value) && METHODS[Object.keys(value)[0]]) {
        methodKey = Object.keys(value)[0]
      }

      if (!methodKey || methodKey !== '$remove' || fieldType !== 'map') {
        if (methodKey === '$increment' || methodKey === '$decrement') { value = Number(value) }

        let valueToValidate = methodKey ? value[methodKey] : value

        if (valueToValidate) {
          if (fieldType === 'timeuuid') {
            if (valueToValidate instanceof types.TimeUuid || Buffer.isBuffer(valueToValidate)) {
              data[field] = valueToValidate.toString()
            } else {
              valueToValidate = types.TimeUuid.fromString(valueToValidate.toString())
            }
          } else if (fieldType === 'uuid') {
            if (valueToValidate instanceof types.Uuid || Buffer.isBuffer(valueToValidate)) {
              data[field] = valueToValidate.toString()
            } else {
              valueToValidate = types.Uuid.fromString(valueToValidate.toString())
            }
          }
        }

        const validated = model.validate(field, valueToValidate)

        if (validated !== true) { throw new errors.BadRequest(validated()) }
      }
    }
  }

  prepareUpdateResult (data, oldData, newObject) {
    const modelFields = this.Model._properties.schema.fields

    Object.keys(data).forEach(field => {
      const fieldType = isPlainObject(modelFields[field]) ? modelFields[field].type : modelFields[field]
      const value = data[field]
      const oldFieldValue = oldData[field]

      if (fieldType && ['map', 'list', 'set'].includes(fieldType) && isPlainObject(value)) {
        const methodKey = Object.keys(value)[0]
        const fieldValue = value[methodKey]

        if (methodKey === '$add') {
          if (fieldType === 'map') {
            newObject[field] = oldFieldValue ? Object.assign({}, oldFieldValue, fieldValue) : fieldValue
          } else if (fieldType === 'list') {
            newObject[field] = oldFieldValue ? oldFieldValue.concat(fieldValue) : fieldValue
          } else if (fieldType === 'set') {
            newObject[field] = Array.from(new Set(oldFieldValue ? oldFieldValue.concat(fieldValue) : fieldValue)).sort()
          }
        } else if (methodKey === '$remove' && oldFieldValue) {
          if (fieldType === 'map') {
            newObject[field] = oldFieldValue
            fieldValue.forEach(prop => delete newObject[field][prop])

            if (!Object.keys(newObject[field]).length) {
              newObject[field] = null
            }
          } else if (fieldType === 'list' || fieldType === 'set') {
            newObject[field] = oldFieldValue.filter(val => !fieldValue.includes(val))

            if (!newObject[field].length) {
              newObject[field] = null
            }
          }
        }
      } else if (fieldType === 'set') {
        newObject[field] = Array.from(new Set(value)).sort()
      } else if (fieldType === 'counter' && isPlainObject(value)) {
        const methodKey = Object.keys(value)[0]
        const fieldValue = value[methodKey]

        if (methodKey === '$increment') {
          newObject[field] = oldFieldValue.add(Number(fieldValue))
        } else if (methodKey === '$decrement') {
          newObject[field] = oldFieldValue.subtract(Number(fieldValue))
        }
      }
    })
  }

  exec (query) {
    return new Promise((resolve, reject) => {
      query.exec((err, res) => {
        if (err) return reject(err)
        resolve(res)
      })
    })
  }

  _find (params, count, getFilter = this.filterQuery) {
    let allowFiltering = false
    let filtersQueue = null
    const { filters, query } = getFilter(params.query || {}, { operators: QUERY_OPERATORS })
    const materializedView = this.getMaterializedView(query, this.materializedViews)
    const q = this.createQuery(filters, query)

    if (materializedView) { q.from(materializedView) }

    if (params.query) {
      if (params.query.$allowFiltering) {
        allowFiltering = true
        q.allowFiltering()
        delete params.query.$allowFiltering
      }

      if (params.query.$filters) {
        filtersQueue = this.runFilters(params, q, params.query.$filters)
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

      return this.exec(q)
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
      let countQuery = this._createQuery()
        .select()
        .count('*')

      if (allowFiltering) { countQuery.allowFiltering() }

      if (filtersQueue) {
        for (const filter of filtersQueue) { filter(countQuery) }
      }

      this.objectify(countQuery, query)

      return this.exec(countQuery)
        .then(res => {
          return executeQuery(res)
        })
        .catch(errorHandler)
    }

    return executeQuery().catch(errorHandler)
  }

  /**
   * `find` service function for FeathersCassandra.
   * @param params
   */
  find (params) {
    const paginate =
      params && typeof params.paginate !== 'undefined'
        ? params.paginate
        : this.paginate

    const result = this._find(params, !!paginate.default, query =>
      this.filterQuery(query, { paginate, operators: QUERY_OPERATORS })
    )

    if (!paginate.default) {
      return result.then(page => page.data)
    }

    return result
  }

  _get (id, params) {
    const query = Object.assign({}, params.query, this.getIdsQuery(id))

    return this._find(Object.assign({}, params, { query }))
      .then(page => {
        if (page.data.length !== 1) {
          throw new errors.NotFound(`No record found for id '${id}'`)
        }

        return page.data[0]
      })
  }

  /**
   * `get` service function for FeathersCassandra.
   * @param {...object} args
   * @return {Promise} - promise containing the data being retrieved
   */
  get (...args) {
    return this._get(...args)
  }

  _create (data, params) {
    this.validate(data)
    this.setTimestampFields(data, true, true)
    this.setVersionField(data)

    const beforeHook = this.Model._properties.schema.before_save
    const afterHook = this.Model._properties.schema.after_save
    const hookOptions = this.getHookOptions(params.query)

    if (beforeHook && beforeHook(data, hookOptions) === false) { throw new errors.BadRequest('Error in before_save lifecycle function') }

    let q = this._createQuery('create')

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

    return this.exec(q
      .insert(data))
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

  /**
   * `create` service function for FeathersCassandra.
   * @param {object} data
   * @param {object} params
   */
  create (data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this._create(current, params)))
    }

    return this._create(data, params)
  }

  _update (id, data, params, oldData) {
    const modelFields = this.Model._properties.schema.fields
    const fields = Object.keys(oldData || modelFields)
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

    this.prepareData(q, newObject)

    q.set(newObject)

    Object.keys(idsQuery).forEach(key => {
      q.where(key, '=', idsQuery[key])
    })

    return this.exec(q)
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
          this.prepareUpdateResult(data, oldData, newObject)
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

  /**
   * `update` service function for FeathersCassandra.
   * @param id
   * @param data
   * @param params
   */
  update (id, data, params) {
    if (Array.isArray(data)) {
      return Promise.reject(
        new errors.BadRequest('Not replacing multiple records. Did you mean `patch`?')
      )
    }

    this.validate(data, 'update')
    this.setTimestampFields(data, true)
    this.setVersionField(data)

    const beforeHook = this.Model._properties.schema.before_update
    const afterHook = this.Model._properties.schema.after_update
    const hookOptions = this.getHookOptions(params.query)

    if (beforeHook && beforeHook(params.query, data, hookOptions, id) === false) { throw new errors.BadRequest('Error in before_update lifecycle function') }

    if (params.query && params.query.$noSelect) {
      delete params.query.$noSelect
      return this._update(id, data, params)
        .then(data => {
          if (afterHook && afterHook(params.query, data, hookOptions, id) === false) { throw new errors.BadRequest('Error in after_update lifecycle function') }
          return data
        })
    }

    return this._get(id, params)
      .then(oldData => {
        return this._update(id, data, params, oldData)
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
  patch (id, data, params) {
    this.validate(data, 'patch')
    this.setTimestampFields(data, true)
    this.setVersionField(data)

    const beforeHook = this.Model._properties.schema.before_update
    const afterHook = this.Model._properties.schema.after_update
    const hookOptions = this.getHookOptions(params.query)

    if (beforeHook && beforeHook(params.query, data, hookOptions, id) === false) { throw new errors.BadRequest('Error in before_update lifecycle function') }

    let query = this.filterQuery(params.query || {}, { operators: QUERY_OPERATORS }).query
    const dataCopy = Object.assign({}, data)

    const mapIds = page => Array.isArray(this.id)
      ? this.id.map(idKey => [...new Set(page.data.map(current => current[idKey]))])
      : page.data.map(current => current[this.id])

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

    let q = this._createQuery('update')

    if (params.query && !isNaN(params.query.$ttl)) {
      q.usingTTL(Number(params.query.$ttl))
      delete params.query.$ttl
    }

    if (params.query && params.query.$timestamp) {
      q.usingTimestamp(params.query.$timestamp)
      delete params.query.$timestamp
    }

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
        const findParams = Object.assign({}, params, {
          query: Object.assign(
            {},
            this.getIdsQuery(id, idList),
            params.query && params.query.$select ? { $select: params.query.$select } : {}
          )
        })

        this.prepareData(q, dataCopy)

        q.set(dataCopy)

        return this.exec(q)
          .then(() => {
            if (afterHook && afterHook(params.query, data, hookOptions, id) === false) { throw new errors.BadRequest('Error in after_update lifecycle function') }

            return params.query && params.query.$noSelect ? {} : this._find(findParams)
              .then(page => {
                const items = page.data

                if (id !== null) {
                  if (items.length === 1) {
                    return items[0]
                  } else {
                    throw new errors.NotFound(`No record found for id '${id}'`)
                  }
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
  remove (id, params) {
    const beforeHook = this.Model._properties.schema.before_delete
    const afterHook = this.Model._properties.schema.after_delete
    const hookOptions = this.getHookOptions(params.query)

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

    const { query: queryParams } = this.filterQuery(params.query || {}, { operators: QUERY_OPERATORS })
    const query = this._createQuery('delete')

    this.objectify(query, queryParams)

    if (params.query && params.query.$noSelect) {
      return this.exec(query)
        .then(() => {
          if (afterHook && afterHook(params.query, hookOptions, id) === false) { throw new errors.BadRequest('Error in after_delete lifecycle function') }
          return {}
        })
        .catch(errorHandler)
    } else {
      return this._find(params)
        .then(page => {
          const items = page.data

          return this.exec(query)
            .then(() => {
              if (afterHook && afterHook(params.query, hookOptions, id) === false) { throw new errors.BadRequest('Error in after_delete lifecycle function') }

              if (id !== null) {
                if (items.length === 1) {
                  return items[0]
                } else {
                  throw new errors.NotFound(`No record found for id '${id}'`)
                }
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
