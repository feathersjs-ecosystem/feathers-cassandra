import path from 'path';
import feathers from 'feathers';
import rest from 'feathers-rest';
import bodyParser from 'body-parser';
import service from '../lib';

const Cassandra = require('express-cassandra');
const models = Cassandra.createClient({
    clientOptions: {
        contactPoints: ['127.0.0.1'],
        protocolOptions: { port: 9042 },
        keyspace: 'test',
        queryOptions: {consistency: Cassandra.consistencies.one}
    },
    ormOptions: {
        defaultReplicationStrategy : {
            class: 'SimpleStrategy',
            replication_factor: 1
        },
        migration: 'alter',
        createKeyspace: true
    }
});

models.connect(function (err) {
  if (err) throw err;
});

const UserModel = models.loadSchema('User', {
  fields:{
    user_uuid: "uuid",
    email    : "text",
    password : "text",
    mobile : "text"
  },
  key: ["user_uuid"],
  materialized_views: {
    users_by_email: {
        select: ["user_uuid","email","password", "mobile"],
        key : ["email","user_uuid"],
    },
    users_by_mobile: {
        select: ["user_uuid","email","password", "mobile"],
        key : ["mobile","user_uuid"],
    }
  },
  table_name: "users"
}, function(err, user){
  
});

// Create a feathers instance.
var app = feathers()
  // Enable REST services
  .configure(rest())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({ extended: true }));

// Create an in-memory Feathers service with a default page size of 2 items
// and a maximum size of 4

// Initialize our service with any options it requires
app.use('/users', service({
  Model: UserModel,
  paginate: {
    default: 5,
    max: 25
  },
  id: "user_uuid",
  materialized_views: [{
    keys: ["email"],
    view: "users_by_email"
  },{
    keys: ["mobile"],
    view: "users_by_mobile"
  }]
}));

// A basic error handler, just like Express
app.use(function (error, req, res, next) {
  res.json(error);
});

// Start the server
export default app.listen(3030);

console.log('Feathers Todo sequelize service running on 127.0.0.1:3030');