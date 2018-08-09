import omit from 'lodash.omit';
import Proto from 'uberproto';
import filter from 'feathers-query-filters';
import errors from 'feathers-errors';
import { select } from 'feathers-commons';
import * as utils from './utils';

class Service {
  constructor (options) {
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
    this.if_not_exist = (typeof options.if_not_exist !== 'undefined' ? options.if_not_exist : this.if_not_exist);
    this.ttl = 0;
    this.ttl = (typeof options.ttl !== 'undefined' ? options.ttl : this.ttl);
    this.cassandraClient = options.cassandraClient || null;
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  _find (params, getFilter = filter) {
    const { filters, query } = getFilter(params.query || params);
    const where = utils.getWhere(query);
    const order = utils.getOrder(filters.$sort);
    const options = utils.getMaterializedOptions({}, where, this.materialized_views);

    const rows = [];
    options.fetchSize = filters.$limit;
    options.allow_filtering = params.allowFiltering;

    if (filters.$limit && filters.$limit.length > 1) {
      options.raw = true;
    }

    return this.Model.eachRowAsync(where, options, function(n, row){
      if (row) {
        rows.push(row);
      }
    }).then(function(result) {
      return rows || [];
    }).catch(utils.errorHandler);
  }

  find (params) {
    const paginate = (params && typeof params.paginate !== 'undefined') ? params.paginate : this.paginate;
    const result = this._find(params, where => filter(where, paginate));

    if (!paginate.default) {
      return result.then(page => page.data);
    }

    return result;
  }

  findOne (params) {
    return this.find(params).then((results) => {
      return (results && results.length > 0) ? results[0] : null;
    }).catch(utils.errorHandler)
  }

  _get (id, params) {
    const {query, options} = utils.getQueryAndOptions(this.id, id, params, this.materialized_views);

    return this.Model.findOneAsync(query, options).then(instance => {
      if (!instance) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      return instance;
    })
    .then(select(params, this.id))
    .catch(utils.errorHandler);
  }

  // returns either the model intance for an id or all unpaginated
  // items for `params` if id is null
  _getOrFind (id, params) {
    if (id === null) {
      return this._find(params).then(page => page.data);
    }

    return this._get(id, params);
  }

  get (id, params) {
    return this._get(id, params).then(select(params, this.id));
  }

  create (data, params) {
    var options = params.cassandra || {};

    if (Array.isArray(data)) {
      if (!this.cassandraClient) {
        return utils.errorHandler(new errors.NotImplemented('Pass `cassandraClient` to the service options to enable bulk create'));
      }

      const queries = [];

      for (const entity of data) {
        queries.push((new this.Model(entity)).save({ return_query: true }));
      }

      return new Promise((resolve, reject) => {
        this.cassandraClient.doBatch(queries, (err) => {
          if (err) {
            return reject(err);
          }

          resolve({});
        });
      }).catch(utils.errorHandler);
    }

    let if_not_exist = (typeof options.if_not_exist !== 'undefined' ? options.if_not_exist : this.if_not_exist);
    let ttl = (typeof options.ttl !== 'undefined' ? options.ttl : this.ttl);

    const model = new this.Model(data);
    return model.saveAsync({ if_not_exist: if_not_exist, ttl: ttl })
    .then(()=> {
      return model;
    })
    .then(select(params, this.id))
    .catch(utils.errorHandler);
  }

  patch (id, data, params) {
    const query = {};
    query[this.id] = id;

    return this.Model.findOneAsync(query).then((instance) => {
      if (!instance) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      Object.keys(data).forEach(function(key) {
        if (typeof instance[key] !== 'undefined') {
          instance[key] == data[key];
        }
      });

      return instance.saveAsync();
    })
    .then(select(params, this.id))
    .catch(utils.errorHandler);
  }

  update (id, data, params) {
    const query = {};
    query[this.id] = id;

    if (Array.isArray(data)) {
      return Promise.reject('Not replacing multiple records. Did you mean `patch`?');
    }

    return this.Model.findOneAsync(query).then(function (instance) {
      if (!instance) {
        throw new errors.NotFound(`No record found for id '${id}'`);
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
    })
    .then(select(params, this.id))
    .catch(utils.errorHandler);
  }

  remove (id, params) {
    const {query, options} = utils.getQueryAndOptions(this.id, id, params, this.materialized_views);

    return this.Model.findOneAsync(query, options).then(function (instance) {
      if (!instance) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      return instance.deleteAsync().then(function () {
        return {};
      });
    })
    .then(select(params, this.id))
    .catch(utils.errorHandler);
  }
}

export default function init (options) {
  return new Service(options);
}

init.Service = Service;
