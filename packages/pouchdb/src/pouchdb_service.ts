import {
  GenericApplicationContext,
  Provide,
  Scope,
  ScopeEnum,
  // Init,
} from '@electron-boot/framework';
import PouchDB from 'pouchdb';
import { PouchdbConfig } from './types';
import * as path from 'node:path';

@Provide()
@Scope(ScopeEnum.Singleton)
export class PouchDBServices extends PouchDB {
  constructor(ctx: GenericApplicationContext, config: PouchdbConfig) {
    let dbname = path.join(config.path, config.name);
    super(dbname, config);
  }
}
