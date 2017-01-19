'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.errorHandler = errorHandler;
exports.getOrder = getOrder;
exports.getWhere = getWhere;
exports.getMaterializedView = getMaterializedView;
exports.types = require('cassandra-driver').types;

var _feathersErrors = require('feathers-errors');
var _isEqual = require('lodash.isequal');

var _feathersErrors2 = _interopRequireDefault(_feathersErrors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function errorHandler(error) {
  var feathersError = error;

  // http://express-cassandra.readthedocs.io/en/latest/errors/

  if (error.name) {
    switch (error.name) {
      /*
      case 'ValidationError':
      case 'UniqueConstraintError':
      case 'ExclusionConstraintError':
      case 'ForeignKeyConstraintError':
      case 'InvalidConnectionError':
        feathersError = new _feathersErrors2.default.BadRequest(error);
        break;
      case 'TimeoutError':
      case 'ConnectionTimedOutError':
        feathersError = new _feathersErrors2.default.Timeout(error);
        break;
      case 'ConnectionRefusedError':
      case 'AccessDeniedError':
        feathersError = new _feathersErrors2.default.Forbidden(error);
        break;
      case 'NotReachableError':
        feathersError = new _feathersErrors2.default.Unavailable(error);
        break;
      case 'NotFoundError':
        feathersError = new _feathersErrors2.default.NotFound(error);
        break;
      */
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

function getMaterializedView(materialized_views, where) {
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

