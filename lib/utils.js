'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.errorHandler = errorHandler;
exports.getOrder = getOrder;
exports.getWhere = getWhere;
exports.getMaterializedOptions = getMaterializedOptions;
exports.getQueryAndOptions = getQueryAndOptions;

var _feathersErrors = require('feathers-errors');

var _feathersErrors2 = _interopRequireDefault(_feathersErrors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _isEqual = require('lodash.isequal');

function errorHandler(error) {
  var feathersError = error;

  if (error.name) {
    switch (error.name) {
      default:
        feathersError = new _feathersErrors2.default.BadRequest(error);
        break;
    }
  }

  throw feathersError;
}

function getOrder() {
  var sort = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var order = [];

  Object.keys(sort).forEach(function (name) {
    return order.push([name, parseInt(sort[name], 10) === 1 ? 'ASC' : 'DESC']);
  });

  return order;
}

function getWhere(query) {
  var where = _extends({}, query);

  Object.keys(where).forEach(function (prop) {
    var value = where[prop];
    if (value && value.$nin) {
      value = _extends({}, value);

      value.$notIn = value.$nin;
      delete value.$nin;

      where[prop] = value;
    }
  });

  return where;
}

function getMaterializedView(where, materialized_views) {
  var keys = Object.keys(where);

  var materialized_view = null;

  if (materialized_views.length > 0 && keys.length > 0) {
    materialized_views.forEach(function (mv) {
      if (_isEqual(mv.keys.sort(), keys.sort())) {
        materialized_view = mv.view;
        return;
      }
    });
  }

  return materialized_view;
}

function getMaterializedOptions() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var where = arguments[1];
  var materialized_views = arguments[2];

  var materialized_view = getMaterializedView(where, materialized_views);
  if (materialized_view) {
    options = _extends(options, {
      materialized_view: materialized_view, raw: true
    });
  }
  return options;
}

function getQueryAndOptions(idField, id, params, materialized_views) {
  var options = params.cassandra || {};
  var q = {};
  q[idField] = id;

  if (params.query && Object.keys(params.query).length > 0) {
    var where = getWhere(params.query);
    q = _extends(q, params.query);
    options = getMaterializedOptions(options, where, materialized_views);
  }

  return { query: q, options: options };
}