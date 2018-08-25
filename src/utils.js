import errors from 'feathers-errors';
import _isEqual from 'lodash.isequal';

export function errorHandler (error) {
  let feathersError = error;

  if (error.name) {
    switch (error.name) {
      default:
        feathersError = new errors.BadRequest(error);
        break;
    }
  }

  throw feathersError;
}

export function getOrder (sort = {}) {
  let order = [];

  Object.keys(sort).forEach(name =>
    order.push([name, parseInt(sort[name], 10) === 1 ? 'ASC' : 'DESC']));

  return order;
}

export function getWhere (query) {
  let where = Object.assign({}, query);

  Object.keys(where).forEach(prop => {
    let value = where[prop];
    if (value && value.$nin) {
      value = Object.assign({}, value);

      value.$notIn = value.$nin;
      delete value.$nin;

      where[prop] = value;
    }
  });

  return where;
}

function getMaterializedView (where, materializedViews) {
  let keys = Object.keys(where);

  var materializedView = null;

  if (materializedViews.length > 0 && keys.length > 0) {
    materializedViews.forEach(function (mv) {
      if (_isEqual(mv.keys.sort(), keys.sort())) {
        materializedView = mv.view;
      }
    });
  }

  return materializedView;
}

export function getMaterializedOptions (options = {}, where, materializedViews) {
  const materializedView = getMaterializedView(where, materializedViews);
  if (materializedView) {
    options = Object.assign(options, {
      materializedView: materializedView, raw: true
    });
  }
  return options;
}

export function getQueryAndOptions (idField, id, params, materializedViews) {
  let options = params.cassandra || {};
  let q = {};
  q[idField] = id;

  if (params.query && Object.keys(params.query).length > 0) {
    const where = getWhere(params.query);
    q = Object.assign(q, params.query);
    options = getMaterializedOptions(options, where, materializedViews);
  }

  return {query: q, options: options};
}
