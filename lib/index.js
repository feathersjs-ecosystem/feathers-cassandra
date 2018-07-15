'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = init;

var _lodash = require('lodash.omit');

var _lodash2 = _interopRequireDefault(_lodash);

var _uberproto = require('uberproto');

var _uberproto2 = _interopRequireDefault(_uberproto);

var _feathersQueryFilters = require('feathers-query-filters');

var _feathersQueryFilters2 = _interopRequireDefault(_feathersQueryFilters);

var _feathersErrors = require('feathers-errors');

var _feathersErrors2 = _interopRequireDefault(_feathersErrors);

var _feathersCommons = require('feathers-commons');

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Service = function () {
  function Service(options) {
    _classCallCheck(this, Service);

    if (!options) {
      throw new Error('Cassandra options have to be provided');
    }

    if (!options.Model) {
      throw new Error('You must provide a Cassandra Model');
    }

    this.paginate = options.paginate || {};
    this.Model = options.Model;
    this.id = options.id || 'id';
    this.events = options.events;
    this.materialized_views = options.materialized_views || [];
    this.if_not_exist = false;
    this.if_not_exist = typeof options.if_not_exist !== 'undefined' ? options.if_not_exist : this.if_not_exist;
    this.cassandraClient = options.cassandraClient || null;
  }

  _createClass(Service, [{
    key: 'extend',
    value: function extend(obj) {
      return _uberproto2.default.extend(obj, this);
    }
  }, {
    key: '_find',
    value: function _find(params) {
      var getFilter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _feathersQueryFilters2.default;

      var _getFilter = getFilter(params.query || params),
          filters = _getFilter.filters,
          query = _getFilter.query;

      var where = utils.getWhere(query);
      var order = utils.getOrder(filters.$sort);
      var options = utils.getMaterializedOptions({}, where, this.materialized_views);

      var rows = [];
      options.fetchSize = filters.$limit;
      options.allow_filtering = params.allowFiltering;

      if (filters.$limit && filters.$limit.length > 1) {
        options.raw = true;
      }

      return this.Model.eachRowAsync(where, options, function (n, row) {
        if (row) {
          rows.push(row);
        }
      }).then(function (result) {
        return rows || [];
      }).catch(utils.errorHandler);
    }
  }, {
    key: 'find',
    value: function find(params) {
      var paginate = params && typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
      var result = this._find(params, function (where) {
        return (0, _feathersQueryFilters2.default)(where, paginate);
      });

      if (!paginate.default) {
        return result.then(function (page) {
          return page.data;
        });
      }

      return result;
    }
  }, {
    key: 'findOne',
    value: function findOne(params) {
      return this.find(params).then(function (results) {
        return results && results.length > 0 ? results[0] : null;
      }).catch(utils.errorHandler);
    }
  }, {
    key: '_get',
    value: function _get(id, params) {
      var _utils$getQueryAndOpt = utils.getQueryAndOptions(this.id, id, params, this.materialized_views),
          query = _utils$getQueryAndOpt.query,
          options = _utils$getQueryAndOpt.options;

      return this.Model.findOneAsync(query, options).then(function (instance) {
        if (!instance) {
          throw new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\'');
        }

        return instance;
      }).then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
    }

    // returns either the model intance for an id or all unpaginated
    // items for `params` if id is null

  }, {
    key: '_getOrFind',
    value: function _getOrFind(id, params) {
      if (id === null) {
        return this._find(params).then(function (page) {
          return page.data;
        });
      }

      return this._get(id, params);
    }
  }, {
    key: 'get',
    value: function get(id, params) {
      return this._get(id, params).then((0, _feathersCommons.select)(params, this.id));
    }
  }, {
    key: 'create',
    value: function create(data, params) {
      var _this = this;

      var options = params.cassandra || {};

      if (Array.isArray(data)) {
        if (!this.cassandraClient) {
          return utils.errorHandler(new _feathersErrors2.default.NotImplemented('Pass `cassandraClient` to the service options to enable bulk create'));
        }

        var queries = [];

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = data[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var entity = _step.value;

            queries.push(new this.Model(entity).save({ return_query: true }));
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        return new Promise(function (resolve, reject) {
          _this.cassandraClient.doBatch(queries, function (err) {
            if (err) {
              return reject(err);
            }

            resolve({});
          });
        }).catch(utils.errorHandler);
      }

      var if_not_exist = typeof options.if_not_exist !== 'undefined' ? options.if_not_exist : this.if_not_exist;

      var model = new this.Model(data);
      return model.saveAsync({ if_not_exist: if_not_exist }).then(function () {
        return model;
      }).then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
    }
  }, {
    key: 'patch',
    value: function patch(id, data, params) {
      var query = {};
      query[this.id] = id;

      return this.Model.findOneAsync(query).then(function (instance) {
        if (!instance) {
          throw new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\'');
        }

        Object.keys(data).forEach(function (key) {
          if (typeof instance[key] !== 'undefined') {
            instance[key] == data[key];
          }
        });

        return instance.saveAsync();
      }).then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
    }
  }, {
    key: 'update',
    value: function update(id, data, params) {
      var query = {};
      query[this.id] = id;

      if (Array.isArray(data)) {
        return Promise.reject('Not replacing multiple records. Did you mean `patch`?');
      }

      return this.Model.findOneAsync(query).then(function (instance) {
        if (!instance) {
          throw new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\'');
        }

        var copy = {};
        Object.keys(instance.toJSON()).forEach(function (key) {
          if (typeof data[key] === 'undefined') {
            copy[key] = null;
          } else {
            copy[key] = data[key];
          }
        });

        return instance.saveAsync();
      }).then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
    }
  }, {
    key: 'remove',
    value: function remove(id, params) {
      var _utils$getQueryAndOpt2 = utils.getQueryAndOptions(this.id, id, params, this.materialized_views),
          query = _utils$getQueryAndOpt2.query,
          options = _utils$getQueryAndOpt2.options;

      return this.Model.findOneAsync(query, options).then(function (instance) {
        if (!instance) {
          throw new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\'');
        }

        return instance.deleteAsync().then(function () {
          return {};
        });
      }).then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
    }
  }]);

  return Service;
}();

function init(options) {
  return new Service(options);
}

init.Service = Service;
module.exports = exports['default'];
