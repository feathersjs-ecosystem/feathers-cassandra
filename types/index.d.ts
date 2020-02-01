// TypeScript Version: 3.0
import { Params, Paginated, Id, NullableId } from '@feathersjs/feathers';
import { AdapterService, ServiceOptions, InternalServiceMethods } from '@feathersjs/adapter-commons';

export interface MaterializedView {
  view: string;
  keys: string[];
}

export interface CassandraServiceOptions extends ServiceOptions {
  model: object;
  idSeparator: string;
  materializedViews: MaterializedView[];
}

export class Service<T = any> extends AdapterService<T> implements InternalServiceMethods<T> {
  model: object;
  options: CassandraServiceOptions;

  constructor(config?: Partial<CassandraServiceOptions>);

  _find(params?: Params): Promise<T | T[] | Paginated<T>>;
  _get(id: Id, params?: Params): Promise<T>;
  _create(data: Partial<T> | Array<Partial<T>>, params?: Params): Promise<T | T[]>;
  _update(id: NullableId, data: T, params?: Params): Promise<T>;
  _patch(id: NullableId, data: Partial<T>, params?: Params): Promise<T>;
  _remove(id: NullableId, params?: Params): Promise<T>;
}

// tslint:disable-next-line:no-unnecessary-generics
declare const cassandra: (<T>(config?: Partial<CassandraServiceOptions>) => Service<T>);
export default cassandra;
