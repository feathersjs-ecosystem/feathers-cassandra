const feathers = require('@feathersjs/feathers');
const sleep = require('await-sleep');
const services = require('./services');
const FeathersCassandra = require('../src');

const KEYSPACE = 'test';

let app = null;

const exec = async (query) => {
  return new Promise((resolve, reject) => {
    query.exec((err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
};

const truncateTables = async cassanknex => {
  await exec(cassanknex(KEYSPACE).truncate('people'));
  await exec(cassanknex(KEYSPACE).truncate('people_custom_id'));
  await exec(cassanknex(KEYSPACE).truncate('people_rooms'));
  await exec(cassanknex(KEYSPACE).truncate('people_rooms_custom_id_separator'));
  await exec(cassanknex(KEYSPACE).truncate('people_mv'));
  await exec(cassanknex(KEYSPACE).truncate('adapter_tests_people'));
  await exec(cassanknex(KEYSPACE).truncate('adapter_tests_people_custom_id'));
  await exec(cassanknex(KEYSPACE).truncate('todos'));
};

const prepare = async () => {
  return new Promise((resolve, reject) => {
    function knex (app) {
      const cassandraClient = app.get('models').orm.get_system_client();

      cassandraClient.connect(err => {
        if (err) return reject(err);

        const cassanknex = require('cassanknex')({
          connection: cassandraClient
        });

        FeathersCassandra.cassanknex(cassanknex);

        cassanknex.on('ready', async err => {
          if (err) return reject(err);

          await sleep(30000);
          await truncateTables(cassanknex);

          resolve();
        });
      });
    }

    sleep(5000).then(() => { // wait for keyspace to be created by the Todos example app
      const ExpressCassandra = require('express-cassandra');
      const models = ExpressCassandra.createClient({
        clientOptions: {
          contactPoints: ['127.0.0.1'],
          localDataCenter: 'datacenter1',
          protocolOptions: { port: 9042 },
          keyspace: KEYSPACE,
          queryOptions: { consistency: ExpressCassandra.consistencies.one }
        },
        ormOptions: {
          defaultReplicationStrategy: {
            class: 'SimpleStrategy',
            replication_factor: 1
          },
          migration: 'alter',
          createKeyspace: false
        }
      });

      app = feathers()
        .set('models', models)
        .configure(knex)
        .configure(services);
    });
  });
};

module.exports = {
  prepare,
  app: {
    get: name => app.get(name),
    service: name => app.service(name)
  }
};
