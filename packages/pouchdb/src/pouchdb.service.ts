import type { GenericApplicationContext } from '@electron-boot/framework'
import { Provide, Scope, ScopeEnum } from '@electron-boot/framework'
import PouchDB from 'pouchdb'
import type { PouchdbConfig } from './types'
import * as path from 'node:path'

@Provide()
@Scope(ScopeEnum.Singleton)
export class PouchdbService extends PouchDB {
  constructor(_ctx: GenericApplicationContext, config: PouchdbConfig) {
    const dbname = path.join(config.path, config.name)
    super(dbname, config)
  }
}
