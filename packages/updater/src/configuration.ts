import type { GenericApplicationContext } from "@electron-boot/framework";
import { ConfigService, Configuration } from "@electron-boot/framework";
import { updaterConfig } from "./config.default";
import { UpdaterService } from "./updater.service";

@Configuration({
  namespace: "updater",
  imports: [
    {
      component: UpdaterService,
    },
  ],
  importConfigs: [
    {
      default: updaterConfig,
    },
  ],
})
export class PouchdbConfiguration {
  constructor(ctx: GenericApplicationContext) {
    const configuration = ctx.get(ConfigService).getConfiguration("updater");
    ctx.get<UpdaterService>(UpdaterService, [ctx, configuration]);
  }
}
