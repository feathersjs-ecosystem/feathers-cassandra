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

export function getMaterializedView (materialized_views, where) {
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