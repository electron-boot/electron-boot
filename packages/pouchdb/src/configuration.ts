import {
  ConfigService,
  Configuration,
  GenericApplicationContext,
} from '@electron-boot/framework';
import { pouchdbConfig } from './config.default';
import { PouchDBServices } from './pouchdb_service';

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
  constructor(ctx: GenericApplicationContext) {
    let configuration = ctx.get(ConfigService).getConfiguration('pouchdb');
    ctx.get<PouchDBServices>(PouchDBServices, [ctx, configuration]);
  }
}
