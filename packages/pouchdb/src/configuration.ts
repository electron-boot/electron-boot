import type { GenericApplicationContext } from '@electron-boot/framework'
import { ConfigService, Configuration } from '@electron-boot/framework'
import { pouchdbConfig } from './config.default'
import { PouchdbService } from './pouchdb.service'

@Configuration({
  namespace: 'pouchdb',
  imports: [
    {
      component: PouchdbService
    }
  ],
  importConfigs: [
    {
      default: pouchdbConfig
    }
  ]
})
export class PouchdbConfiguration {
  constructor(ctx: GenericApplicationContext) {
    const configuration = ctx.get(ConfigService).getConfiguration('pouchdb')
    ctx.get<PouchdbService>(PouchdbService, [ctx, configuration])
  }
}
