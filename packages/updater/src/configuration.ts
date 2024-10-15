import {
  ConfigService,
  Configuration,
  GenericApplicationContext,
} from '@electron-boot/framework';
import { pouchdbConfig } from './config.default';
import { UpdaterService } from './updater.service';

@Configuration({
  namespace: 'pouchdb',
  imports: [
    {
      component: UpdaterService,
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
    ctx.get<UpdaterService>(UpdaterService, [ctx, configuration]);
  }
}
