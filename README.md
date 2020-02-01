# feathers-cassandra

[![Build Status](https://travis-ci.org/feathersjs-ecosystem/feathers-cassandra.svg?branch=master)](https://travis-ci.org/feathersjs-ecosystem/feathers-cassandra)
[![Coverage Status](https://coveralls.io/repos/github/feathersjs-ecosystem/feathers-cassandra/badge.svg?branch=master)](https://coveralls.io/github/feathersjs-ecosystem/feathers-cassandra?branch=master)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![Dependency Status](https://img.shields.io/david/feathersjs-ecosystem/feathers-cassandra.svg)](https://david-dm.org/feathersjs-ecosystem/feathers-cassandra)
[![npm](https://img.shields.io/npm/v/feathers-cassandra.svg?maxAge=3600)](https://www.npmjs.com/package/feathers-cassandra)
[![Greenkeeper badge](https://badges.greenkeeper.io/feathersjs-ecosystem/feathers-cassandra.svg)](https://greenkeeper.io/)

[Feathers](https://feathersjs.com/) service adapter for Cassandra DB based on [Express-Cassandra](https://express-cassandra.readthedocs.io) ORM and [CassanKnex](https://github.com/azuqua/cassanknex) query builder

## Installation

```bash
npm install --save feathers-cassandra
npm install --save express-cassandra
npm install --save cassanknex
```

### [Feathers CLI](https://github.com/feathersjs/feathers/tree/master/packages/cli)

Use `feathers generate service` command to generate a new `Cassandra` service.

## Documentation

Please refer to the [Feathers database adapter documentation](https://docs.feathersjs.com/api/databases/adapters.html) for more details or directly at:

- [Querying](https://docs.feathersjs.com/api/databases/querying.html) - The common adapter querying mechanism
- [Extending](https://docs.feathersjs.com/api/databases/common.html#extending-adapters) - How to extend a database adapter

Refer to the official [Express-Cassanndra documention](https://express-cassandra.readthedocs.io).

It works like the [Knex service](https://github.com/feathersjs/feathers-knex) adapter by using [CassanKnex](https://github.com/azuqua/cassanknex), except it has all
the benefits of the Express-Cassandra ORM.

### Service Options

- `model` (**required**) - The Express-Cassandra model definition
- `id` (*optional*, default: `'id'`) - The name of the id field property. Use array of strings for composite primary keys
- `events` (*optional*) - A list of [custom service events](https://docs.feathersjs.com/api/events.html#custom-events) sent by this service
- `paginate` (*optional*) - A [pagination object](https://docs.feathersjs.com/api/databases/common.html#pagination) containing a `default` and `max` page size
- `multi` (*optional*) - Allow `create` with arrays and `update` and `remove` with `id` `null` to change multiple items. Can be `true` for all methods or an array of allowed methods (e.g. `[ 'remove', 'create' ]`)
- `whitelist` (*optional*) - A list of additional query operators to allow (e.g. `[ '$token', '$allowFiltering' ]`)

### Default Query Operators
 
Starting at version 2.0.0 `feathers-cassandra` converts queries securely. If you want to support additional Cassandra operators, the `whitelist` service option can contain an array of additional allowed operators. By default, supported operators are:
 
```
$eq
$ne
$gte
$gt
$lte
$lt
$in
```

### Supported Operators

##### Query Operators

| Operator | Native Operator | Description | Example |
|:---: | :---: | --- | --- |
| `$ne` | `!=` | Applicable for IF conditions only | `id: { $ne: 1 }` |
| `$isnt` | `IS NOT` | Applicable for materialized view filters only | `id: { $isnt: 1 }` |
| `$gt` | `>` | Greater than | `id: { $ne: 1 }` |
| `$lt` | `<` | Lower than | `id: { $lt: 1 }` |
| `$gte` | `>=` | Greater than or equal | `id: { $gte: 1 }` |
| `$lte` | `<=` | Lower than or equal | `id: { $lte: 1 }` |
| `$in` | `IN` | Equal to item in list | `id: { $in: [1, 2] }` |
| `$like` | `LIKE` | Applicable for SASI indexes only | `text: { $like: '%abc%' }` |
| `$sort` | `ORDER BY` | Sort results | ASC: `$sort: { id: 1 }` DESC: `$sort: { id: -1 }` |
| `$limit` | `LIMIT` | Sets the maximum number of rows that the query returns | `$limit: 2` |
| `$select` | `SELECT` | Sets fields to return. you can also select a field with applied Cassandra function: `writetime`, `ttl`, `dateOf`, `unixTimestampOf`, `toDate`, `toTimestamp` & `toUnixTimestamp` | `$select: ['id', 'name', 'writetime(name)', 'dateOf(name)']` |

##### Cassandra Query Operators

| Operator | Native Operator | Description | Example |
|:---: | :---: | --- | --- |
| `$token` | `TOKEN` | Token query on primary keys. can be used for pagination | Single key: `$token: { id: { $gt: 1 } }` Multiple keys: `$token: { $keys: ['id', 'time'], $condition: { $gt: [1, 2] } }`  |
| `$minTimeuuid` | `minTimeuuid` | Query on `timeuuid` column given a time component. [read more](http://cassandra.apache.org/doc/4.0/cql/functions.html#mintimeuuid-and-maxtimeuuid) | `$minTimeuuid: { timeuuid: { $lt: '2013-02-02 10:00+0000' } }` |
| `$maxTimeuuid` | `maxTimeuuid` | Query on `timeuuid` column given a time component. [read more](http://cassandra.apache.org/doc/4.0/cql/functions.html#mintimeuuid-and-maxtimeuuid) | `$maxTimeuuid: { timeuuid: { $gt: '2013-01-01 00:05+0000' } }` |
| `$contains` | `CONTAINS` | Search in indexed list, set or map | `colors: { $contains: 'blue' }` |
| `$containsKey` | `CONTAINS KEY` | Search in indexed map | `colors: { $containsKey: 'dark' }` |
| `$if` | `IF` | Condition that must return TRUE for the update to succeed. Will be used automatically when an update, patch or remove request query by id with additional query conditions | `$if: { name: 'John' }` |
| `$ifExists` | `IF EXISTS` | Make the UPDATE fail when rows don't match the WHERE conditions | `$ifExists: true` |
| `$ifNotExists` | `IF NOT EXISTS` | Inserts a new row of data if no rows match the PRIMARY KEY values | `$ifNotExists: true` |
| `$allowFiltering` | `ALLOW FILTERING` | Provides the capability to query the clustering columns using any condition | `$allowFiltering: true` |
| `$limitPerPartition` | `PER PARTITION LIMIT` | Sets the maximum number of rows that the query returns from each partition | `$limitPerPartition: 1` |
| `$ttl` | `USING TTL` | Sets a time in seconds for data in a column to expire. use in create, update & patch requests | `$ttl: 60` |
| `$timestamp` | `USING TIMESTAMP` | Sets a timestamp for data in a column to expire. use in create, update & patch requests | `$timestamp: 1537017312928000` |

##### Special Query Operators

| Operator | Native Operator | Description | Example |
|:---: | :---: | --- | --- |
| `$noSelect` |  | Skips SELECT queries in create, update, patch & remove requests. Response data will be based on the input data | `$noSelect: true` |
| `$batch` |  | Batch create queries. Response data will be based on the input data | `$batch: true` |
| `$filters` |  | Sets Model's CassanKnex filters to run on a get or find request | `$filters: ['completed', 'recent']` |

##### Cassandra Data Operators

| Operator | Native Operator | Description | Example |
|:---: | :---: | --- | --- |
| `$add` | `+` | Adds to a list, set or map | List/Set: `colors: { $add: ['blue', 'red'] }` Map: `colors: { $add: { dark: 'blue', bright: 'red' } }` |
| `$remove` | `-` | Removes from a list, set or map | List/Set: `colors: { $remove: ['blue', 'red'] }` Map: `colors: { $remove: ['dark', 'bright'] }` |
| `$increment` | `+` | Increments a counter | `days: { $increment: 2 }` |
| `$decrement` | `-` | Decrements a counter | `days: { $decrement: 2 }` |

### Passing Cassandra [queryOptions](https://docs.datastax.com/en/developer/nodejs-driver/3.3/api/type.QueryOptions/)

Set `params.queryOptions` to override options per query, like [setting a different consistency level for a single query](http://datastax.github.io/nodejs-driver/getting-started/#setting-the-consistency-level).  

### Materialized Views

A materialized view will be automatically queried against when a query contains only that view's keys. 

### Model Hooks

Works like [Express-Cassandra Hook Functions](https://express-cassandra.readthedocs.io/en/stable/management/#hook-functions), but arguments will contain Feathers-Cassandra equivalent objects - data, query, query operators as options & id. 

### Model CassanKnex Filters

Filter functions that call CassanKnex methods on the query builder object before execution.  

Filter functions runs in get & find requests when specified in the `query.$filters` array.

### Cassandra

Set Cassandra init options as defined in [Cassandra](https://docs.datastax.com/en/developer/nodejs-driver/3.5/api/type.ClientOptions/) & [Express-Cassandra](https://express-cassandra.readthedocs.io/en/latest/usage/#explanations-for-the-options-used-to-initialize):

config/defaults.json
```json
{
  "cassandra": {
    "clientOptions": {
      "contactPoints": [
        "127.0.0.1"
      ],
      "protocolOptions": {
        "port": 9042
      },
      "keyspace": "test",
      "queryOptions": {
        "consistency": 1
      }
    },
    "ormOptions": {
      "defaultReplicationStrategy": {
       "class": "SimpleStrategy",
       "replication_factor": 1
      },
      "migration": "alter",
      "createKeyspace": true
    }
  }
}
```  

cassandra.js
```js
const ExpressCassandra = require('express-cassandra')
const FeathersCassandra = require('feathers-cassandra')

module.exports = function (app) {
  const connectionInfo = app.get('cassandra')
  const models = ExpressCassandra.createClient(connectionInfo)
  const cassandraClient = models.orm.get_system_client()

  app.set('models', models)

  cassandraClient.connect(err => {
    if (err) throw err

    const cassanknex = require('cassanknex')({ connection: cassandraClient })

    FeathersCassandra.cassanknex(cassanknex)

    cassanknex.on('ready', err => {
      if (err) throw err
    })
  })
}
```

### Models

Define [Express-Cassandra Models](https://express-cassandra.readthedocs.io/en/latest/schema/) for your tables:

todos.model.js
```js
module.exports = function (app) {
  const models = app.get('models')
  const Todo = models.loadSchema('Todo', {
    table_name: 'todo',
    fields: {
      id: 'int',
      text: {
        type: 'text',
        rule: {
          required: true,
          validators: [
            {
              validator: function (value) { return value !== 'forbidden' },
              message: '`forbidden` is a reserved word'
            }
          ]
        }
      },
      complete: 'boolean',
      teams: {
        type: 'map',
        typeDef: '<text, text>'
      },
      games: {
        type: 'list',
        typeDef: '<text>'
      },
      winners: {
        type: 'set',
        typeDef: '<text>'
      }
    },
    key: ['id'],
    custom_indexes: [
      {
        on: 'text',
        using: 'org.apache.cassandra.index.sasi.SASIIndex',
        options: {}
      },
      {
        on: 'complete',
        using: 'org.apache.cassandra.index.sasi.SASIIndex',
        options: {}
      }
    ],
    options: {
      // timestamps: true
      timestamps: {
        createdAt: 'created_at', // defaults to createdAt
        updatedAt: 'updated_at' // defaults to updatedAt
      },
      // versions: true
      versions: {
        key: '_version' // defaults to __v
      }
    },
    filters: {
      completed: builder => {
        builder.where('complete', '=', true)
      }
    },
    before_save: function (instance, options) {
      instance.complete = false
      return true
    },
    after_save: function (instance, options) {
      return true
    },
    before_update: function (queryObject, updateValues, options, id) {
      updateValues.complete = true
      return true
    },
    after_update: function (queryObject, updateValues, options, id) {
      return true
    },
    before_delete: function (queryObject, options, id) {
      return true
    },
    after_delete: function (queryObject, options, id) {
      return true
    }
  }, function (err) {
    if (err) throw err
  })

  Todo.syncDB(function (err) {
    if (err) throw err
  })

  return Todo
}
```

When defining a service, you must provide the model:
```js
app.use('/todos', service({
  model: Todo
})
```
### Service

todos.service.js
```js
const createService = require('feathers-cassandra')
const createModel = require('./todos.model')

module.exports = function (app) {
  const Model = createModel(app)

  const options = {
    model: Model,
    paginate: {
      default: 2,
      max: 4
    },
    whitelist: ['$allowFiltering', '$filters', '$ttl', '$if']
  }

  app.use('/todos', createService(options))
}
```

### Composite primary keys

Composite primary keys can be passed as the `id` argument using the following methods:

* String with values separated by the `idSeparator` property (order matter, recommended for REST)
* JSON array (order matter, recommended for internal service calls)
* JSON object (more readable, recommended for internal service calls)

When calling a service method with the `id` argument, all primary keys are required to be passed.

#### Options

* **`idSeparator`** - (optional) separator char to separate Composite primary keys in the `id` argument 
  of get/patch/update/remove external service calls. Defaults to `','`.
  
```js
app.use('/user-todos', service({
  idSeparator: ','
})

app.service('/user-todos').get('1,2')
app.service('/user-todos').get([1, 2])
app.service('/user-todos').get({ userId: 1, todoId: 2 })
```  

* **`materializedViews`** - (optional) array of materialized views to use when queries contains the same set of columns that constructs their compound PK.

```js
app.use('/players', service({
  materializedViews: [
    {
      view: 'top_season_players',
      keys: [
        'season',
        'score'
      ]
    }
  ]
})
```  

## Complete Example

Here's a complete example of a Feathers server with a `todos` Feathers-Cassandra service:

```js
const feathers = require('@feathersjs/feathers')
const express = require('@feathersjs/express')
const rest = require('@feathersjs/express/rest')
const errorHandler = require('@feathersjs/express/errors')
const bodyParser = require('body-parser')
const ExpressCassandra = require('express-cassandra')
const FeathersCassandra = require('feathers-cassandra')

// Initialize Express-Cassandra
const models = ExpressCassandra.createClient({
  clientOptions: {
    contactPoints: ['127.0.0.1'],
    protocolOptions: { port: 9042 },
    keyspace: 'test',
    queryOptions: { consistency: ExpressCassandra.consistencies.one }
  },
  ormOptions: {
    defaultReplicationStrategy: {
      class: 'SimpleStrategy',
      replication_factor: 1
    },
    migration: 'alter',
    createKeyspace: true
  }
})

// Get Cassandra client
const cassandraClient = models.orm.get_system_client()

// Connect to Cassandra
cassandraClient.connect(err => {
  if (err) throw err

  // Initialize CassanKnex with the current Cassandra connection
  const cassanknex = require('cassanknex')({ connection: cassandraClient })

  // Bind CassanKnex
  FeathersCassandra.cassanknex(cassanknex)

  cassanknex.on('ready', err => {
    if (err) throw err
  })
})

// Create a feathers instance.
const app = express(feathers())
  // Enable REST services
  .configure(rest())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({ extended: true }))

app.set('models', models)

// Create an Express-Cassandra Model
const Todo = models.loadSchema('Todo', {
  table_name: 'todo',
  fields: {
    id: 'int',
    text: {
      type: 'text',
      rule: {
        required: true,
        validators: [
          {
            validator: function (value) { return value !== 'forbidden' },
            message: '`forbidden` is a reserved word'
          }
        ]
      }
    },
    complete: 'boolean',
    teams: {
      type: 'map',
      typeDef: '<text, text>'
    },
    games: {
      type: 'list',
      typeDef: '<text>'
    },
    winners: {
      type: 'set',
      typeDef: '<text>'
    }
  },
  key: ['id'],
  custom_indexes: [
    {
      on: 'text',
      using: 'org.apache.cassandra.index.sasi.SASIIndex',
      options: {}
    },
    {
      on: 'complete',
      using: 'org.apache.cassandra.index.sasi.SASIIndex',
      options: {}
    }
  ],
  options: {
    timestamps: {
      createdAt: 'created_at', // defaults to createdAt
      updatedAt: 'updated_at' // defaults to updatedAt
    },
    versions: {
      key: '_version' // defaults to __v
    }
  },
  filters: {
    completed: builder => {
      builder.where('complete', '=', true) // CassanKnex filter
    }
  },
  before_save: function (instance, options) {
    instance.complete = false
    return true
  },
  after_save: function (instance, options) {
    return true
  },
  before_update: function (queryObject, updateValues, options, id) {
    updateValues.complete = true
    return true
  },
  after_update: function (queryObject, updateValues, options, id) {
    return true
  },
  before_delete: function (queryObject, options, id) {
    return true
  },
  after_delete: function (queryObject, options, id) {
    return true
  }
}, function (err) {
  if (err) throw err
})

Todo.syncDB(function (err) {
  if (err) throw err
})

// Create Cassandra Feathers service with a default page size of 2 items
// and a maximum size of 4
app.use('/todos', FeathersCassandra({
  model: Todo,
  paginate: {
    default: 2,
    max: 4
  }
}))

// Handle Errors
app.use(errorHandler())

// Start the server
module.exports = app.listen(3030)

console.log('Feathers Todo FeathersCassandra service running on 127.0.0.1:3030')
```

Run the example with `node app` and go to [localhost:3030/todos](http://localhost:3030/todos).

You should see an empty array. That's because you don't have any Todos yet, but you now have full CRUD for your new todos service!

## DB migrations

[Knex Migration CLI](http://knexjs.org/#Migrations) can also be used to manage DB migrations 
and to [seed](http://knexjs.org/#Seeds) a table with mock data:

Change `config.cassandra.ormOptions.migration` to `'safe'`.

Create `cassanknex.js` file:
```js
const ExpressCassandra = require('express-cassandra');
const config = require('config');
let cassanknex = null;

const getCassanknex = async () => {
  return new Promise((resolve, reject) => {
    if (cassanknex) {
      resolve(cassanknex);

      return;
    }

    const connectionInfo = config.cassandra;

    if (connectionInfo.clientOptions.queryOptions.consistency)
      connectionInfo.clientOptions.queryOptions.consistency = ExpressCassandra.consistencies[connectionInfo.clientOptions.queryOptions.consistency];

    connectionInfo.connection = connectionInfo.clientOptions;

    try {
      cassanknex = require('cassanknex')(connectionInfo);

      cassanknex.on('ready', function (err) {
        if (err) {
          reject(err);

          return;
        }

        resolve(cassanknex);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  getCassanknex,
};
```

Use it inside a Knex migration file:
```js
const { getCassanknex } = require('../cassanknex');

exports.up = () => {
  return new Promise(async (resolve, reject) => {
    const cassanknex = await getCassanknex();

    cassanknex('example').createColumnFamilyIfNotExists('table')
      .uuid('id')
      .text('data')
      .primary('id')
      .exec((err, result) => {
        if (err) {
          reject(err);

          return;
        }

        resolve();
      });
  });
};

exports.down = () => {
  return new Promise(async (resolve, reject) => {
    const cassanknex = await getCassanknex();

    cassanknex('example').dropColumnFamilyIfExists('table')
      .exec((err, result) => {
        if (err) {
          reject(err);

          return;
        }

        resolve();
      });
  });
};
```

## Error handling

As of version 3.4.0, `feathers-cassandra` only throws [Feathers Errors](https://docs.feathersjs.com/api/errors.html) with the message.  
On the server, the original error can be retrieved through a secure symbol via  `error[require('feathers-cassandra').ERROR]`.

```js
const { ERROR } = require('feathers-cassandra');

try {
  await cassandraService.doSomething();
} catch (error) {
  // error is a FeathersError with just the message
  // Safely retrieve the original error
  const originalError = error[ERROR];
}
```

## Migrating to `feathers-cassandra` v2
 
`feathers-cassandra` 2.0.0 comes with important security and usability updates.

> __Important:__ For general migration information to the new database adapter functionality see [crow.docs.feathersjs.com/migrating.html#database-adapters](https://crow.docs.feathersjs.com/migrating.html#database-adapters).

The following breaking changes have been introduced:

- All methods allow additional query parameters
- Multiple updates are disabled by default (see the `multi` option)
- Cassandra related operators are disabled by default (see the `whitelist` option)

## License

Copyright © 2019

Licensed under the [MIT license](LICENSE).
