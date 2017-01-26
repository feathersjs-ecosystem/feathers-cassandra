import errors from 'feathers-errors';
const _isEqual = require('lodash.isequal');

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
    order.push([ name, parseInt(sort[name], 10) === 1 ? 'ASC' : 'DESC' ]));

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

function getMaterializedView (where, materialized_views) {
  let keys = Object.keys(where);

  var materialized_view = null;

  if (materialized_views.length > 0 && keys.length > 0) {
    materialized_views.forEach(function (mv) {
      if (_isEqual(mv.keys.sort(), keys.sort())) {
        materialized_view = mv.view;
        return;
      }
    })
  }

  return materialized_view;  
}

export function getMaterializedOptions(options = {}, where, materialized_views) {
  const materialized_view = getMaterializedView(where, materialized_views);
  if (materialized_view) {
    options = Object.assign(options, {
      materialized_view: materialized_view, raw: true
    });
  }
  return options;
}

export function getQueryAndOptions(idField, id, params, materialized_views) {
  let options = params.cassandra || {};
  let q = {};
  q[idField] = id;

  if (params.query && Object.keys(params.query).length > 0) {
    const where = getWhere(params.query);
    q = Object.assign(q, params.query)
    options = getMaterializedOptions(options, where, materialized_views);
  }
  
  return {query: q, options: options}
}