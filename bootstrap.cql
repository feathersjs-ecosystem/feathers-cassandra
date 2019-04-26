CREATE KEYSPACE test
WITH REPLICATION = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};

CREATE TABLE test.people (
  id int,
  age int,
  created boolean,
  name text,
  time int,
  PRIMARY KEY (id)
);

CREATE TABLE test.people_custom_id (
  custom_id int,
  age int,
  created boolean,
  name text,
  time int,
  PRIMARY KEY (custom_id)
);

CREATE TABLE test.people_rooms (
  people_id int,
  room_id int,
  time int,
  admin boolean,
  PRIMARY KEY ((people_id, room_id), time)
);

CREATE TABLE test.people_rooms_custom_id_separator (
  people_id int,
  room_id int,
  time int,
  admin boolean,
  PRIMARY KEY ((people_id, room_id), time)
);

CREATE TABLE test.people_mv (
  id int,
  name text,
  PRIMARY KEY (id)
);

CREATE MATERIALIZED VIEW test.people_mv_by_name
AS SELECT name
FROM test.people_mv
WHERE name IS NOT NULL
PRIMARY KEY (name, id);

CREATE TABLE test.adapter_tests_people (
  id text,
  name text,
  age int,
  created boolean,
  PRIMARY KEY (id)
);

CREATE TABLE test.adapter_tests_people_custom_id (
  custom_id text,
  name text,
  age int,
  created boolean,
  PRIMARY KEY (custom_id)
);

CREATE TABLE test.todos (
  id int,
  text text,
  complete boolean,
  PRIMARY KEY (id)
);

CREATE CUSTOM INDEX ON test.adapter_tests_people (name) USING 'org.apache.cassandra.index.sasi.SASIIndex'
WITH OPTIONS = { 'mode': 'CONTAINS' };

CREATE CUSTOM INDEX ON test.adapter_tests_people (age) USING 'org.apache.cassandra.index.sasi.SASIIndex'
WITH OPTIONS = { 'mode': 'SPARSE' };

CREATE CUSTOM INDEX ON test.adapter_tests_people (created) USING 'org.apache.cassandra.index.sasi.SASIIndex';

CREATE CUSTOM INDEX ON test.adapter_tests_people_custom_id (name) USING 'org.apache.cassandra.index.sasi.SASIIndex'
WITH OPTIONS = { 'mode': 'CONTAINS' };

CREATE CUSTOM INDEX ON test.adapter_tests_people_custom_id (age) USING 'org.apache.cassandra.index.sasi.SASIIndex'
WITH OPTIONS = { 'mode': 'SPARSE' };

CREATE CUSTOM INDEX ON test.adapter_tests_people_custom_id (created) USING 'org.apache.cassandra.index.sasi.SASIIndex';

CREATE CUSTOM INDEX ON test.people (name) USING 'org.apache.cassandra.index.sasi.SASIIndex'
WITH OPTIONS = { 'mode': 'CONTAINS' };

CREATE CUSTOM INDEX ON test.people (age) USING 'org.apache.cassandra.index.sasi.SASIIndex'
WITH OPTIONS = { 'mode': 'SPARSE' };

CREATE CUSTOM INDEX ON test.people (created) USING 'org.apache.cassandra.index.sasi.SASIIndex';

CREATE CUSTOM INDEX ON test.people (time) USING 'org.apache.cassandra.index.sasi.SASIIndex';

CREATE CUSTOM INDEX ON test.people_custom_id (age) USING 'org.apache.cassandra.index.sasi.SASIIndex'
WITH OPTIONS = { 'mode': 'SPARSE' };

CREATE CUSTOM INDEX ON test.people_custom_id (name) USING 'org.apache.cassandra.index.sasi.SASIIndex'
WITH OPTIONS = { 'mode': 'CONTAINS' };

CREATE CUSTOM INDEX ON test.people_custom_id (created) USING 'org.apache.cassandra.index.sasi.SASIIndex';

CREATE CUSTOM INDEX ON test.people_custom_id (time) USING 'org.apache.cassandra.index.sasi.SASIIndex';

CREATE CUSTOM INDEX ON test.people_rooms (admin) USING 'org.apache.cassandra.index.sasi.SASIIndex';

CREATE CUSTOM INDEX ON test.people_rooms_custom_id_separator (admin) USING 'org.apache.cassandra.index.sasi.SASIIndex';

CREATE CUSTOM INDEX ON test.todos (text) USING 'org.apache.cassandra.index.sasi.SASIIndex';

CREATE CUSTOM INDEX ON test.todos (complete) USING 'org.apache.cassandra.index.sasi.SASIIndex';
