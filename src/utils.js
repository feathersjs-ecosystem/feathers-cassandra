const errors = require('@feathersjs/errors');
const _isEqual = require('lodash.isequal');
const types = require('cassandra-driver').types;

exports.isPlainObject = obj => {
  return obj && obj.constructor === {}.constructor;
};

exports.extractIds = (id, idKey, idSeparator) => {
  if (typeof id === 'object') { return idKey.map(idKey => id[idKey]); }
  if (id[0] === '[' && id[id.length - 1] === ']') { return JSON.parse(id); }
  if (id[0] === '{' && id[id.length - 1] === '}') {
    const obj = JSON.parse(id);
    return Object.keys(obj).map(key => obj[key]);
  }

  if (typeof id !== 'string' || !id.includes(idSeparator)) { throw new errors.BadRequest('When using composite primary key, id must contain values for all primary keys'); }

  return id.split(idSeparator);
};

exports.runFilters = (params, query, filtersExpression, filtersFunctions) => {
  const filters = [];
  const filtersNames = filtersExpression.replace(/[^a-zA-Z0-9_,]/g, '').split(',');

  for (const name of filtersNames) {
    if (name && filtersFunctions[name]) { filters.push(filtersFunctions[name]); }
  }

  for (const filter of filters) { filter(query); }

  return filters;
};

exports.getFieldType = field => {
  return exports.isPlainObject(field) ? field.type : field;
};

exports.getFieldRule = field => {
  return exports.isPlainObject(field) ? field.rule : null;
};

exports.prepareUpdateResult = (data, oldData, newObject, fields) => {
  Object.keys(data).forEach(field => {
    const fieldType = exports.getFieldType(fields[field]);
    const value = data[field];
    const oldFieldValue = oldData[field];

    if (fieldType && ['map', 'list', 'set'].includes(fieldType) && exports.isPlainObject(value)) {
      const methodKey = Object.keys(value)[0];
      const fieldValue = value[methodKey];

      if (methodKey === '$add') {
        if (fieldType === 'map') {
          newObject[field] = oldFieldValue ? Object.assign({}, oldFieldValue, fieldValue) : fieldValue;
        } else if (fieldType === 'list') {
          newObject[field] = oldFieldValue ? oldFieldValue.concat(fieldValue) : fieldValue;
        } else if (fieldType === 'set') {
          newObject[field] = Array.from(new Set(oldFieldValue ? oldFieldValue.concat(fieldValue) : fieldValue)).sort();
        }
      } else if (methodKey === '$remove' && oldFieldValue) {
        if (fieldType === 'map') {
          newObject[field] = oldFieldValue;
          fieldValue.forEach(prop => delete newObject[field][prop]);

          if (!Object.keys(newObject[field]).length) {
            newObject[field] = null;
          }
        } else if (fieldType === 'list' || fieldType === 'set') {
          newObject[field] = oldFieldValue.filter(val => !fieldValue.includes(val));

          if (!newObject[field].length) {
            newObject[field] = null;
          }
        }
      }
    } else if (fieldType === 'set') {
      newObject[field] = Array.from(new Set(value)).sort();
    } else if (fieldType === 'counter' && exports.isPlainObject(value)) {
      const methodKey = Object.keys(value)[0];
      const fieldValue = value[methodKey];

      if (methodKey === '$increment') {
        newObject[field] = oldFieldValue.add(Number(fieldValue));
      } else if (methodKey === '$decrement') {
        newObject[field] = oldFieldValue.subtract(Number(fieldValue));
      }
    }
  });
};

exports.prepareIfCondition = (id, query, idKey) => {
  if (id !== null && !query.$if) {
    query.$if = {};

    Object.keys(query).forEach(key => {
      const idField = Array.isArray(idKey) ? idKey.includes(key) : key === idKey;

      if (!idField && key[0] !== '$') {
        query.$if[key] = query[key];
        delete query[key];
      }
    });
  }
};

exports.getMaterializedView = (query, materializedViews) => {
  const keys = Object.keys(query);

  if (materializedViews.length > 0 && keys.length > 0) {
    for (const mv of materializedViews) {
      if (_isEqual(mv.keys.sort(), keys.sort())) { return mv.view; }
    }
  }

  return null;
};

exports.prepareData = (query, data, methods) => {
  for (const field of Object.keys(data)) {
    const value = data[field];
    let removeKey = false;

    if (exports.isPlainObject(value)) {
      const key = Object.keys(value)[0];
      const fieldValue = value[key];

      if (key === '$add' || key === '$remove' || key === '$increment' || key === '$decrement') {
        query[methods[key]](field, key === '$add' && Array.isArray(fieldValue) ? [fieldValue] : fieldValue);
        removeKey = true;
      }
    }

    if (removeKey) {
      delete data[field];
    }
  }
};

exports.setTimestampFields = (data, updatedAt, createdAt, timestamps) => {
  if (timestamps) {
    const now = new Date().toISOString();
    const createdAtFieldName = 'createdAt';
    const updatedAtFieldName = 'updatedAt';

    if (createdAt && timestamps.createdAt) {
      data[typeof timestamps.createdAt === 'string' ? timestamps.createdAt : createdAtFieldName] = now;
    }
    if (updatedAt && timestamps.updatedAt) {
      data[typeof timestamps.updatedAt === 'string' ? timestamps.updatedAt : updatedAtFieldName] = now;
    }
  }
};

exports.setVersionField = (data, versions) => {
  if (versions) {
    const timeuuidVersion = types.TimeUuid.now();
    const versionFieldName = '__v';

    data[typeof versions.key === 'string' ? versions.key : versionFieldName] = timeuuidVersion;
  }
};

exports.getHookOptions = (query = {}) => {
  const options = {};

  Object.keys(query).forEach(key => {
    if (key[0] === '$') {
      const optionName = key.substr(1).replace(/([A-Z])/g, (match, p1) => '_' + p1.toLowerCase());
      options[optionName] = query[key];
    }
  });

  return options;
};

exports.exec = (query, params) => {
  return new Promise((resolve, reject) => {
    const callback = (err, res) => {
      if (err) return reject(err);
      resolve(res);
    };

    if (params && params.queryOptions) {
      query.exec(params.queryOptions, callback);
    } else {
      query.exec(callback);
    }
  });
};

exports.batch = (cassanKnex, queries, params) => {
  return new Promise((resolve, reject) => {
    const callback = (err, res) => {
      if (err) return reject(err);
      resolve(res);
    };

    if (params && params.queryOptions) {
      cassanKnex().batch({ prepare: true, ...params.queryOptions }, queries, callback);
    } else {
      cassanKnex().batch({ prepare: true }, queries, callback);
    }
  });
};
