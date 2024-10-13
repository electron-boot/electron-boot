import {
  Config,
  Configuration,
  GenericApplicationContext,
} from '@electron-boot/framework';
import { pouchdbConfig } from './config.default';
import { PouchDBServices } from './pouchdb_service';
import { PouchdbConfig } from './types';

@Configuration({
  namespace: 'pouchdb',
  imports: [
    {
      component: PouchDBServices,
    },
  ],
  importConfigs: [
    {
      default: pouchdbConfig,
    },
  ],
})
export class PouchdbConfiguration {
  @Config('pouchdb')
  config: PouchdbConfig;
  async onReady(ctx: GenericApplicationContext) {
    await ctx.getAsync<PouchDBServices>(PouchDBServices, [ctx, this.config]);
  }
}
