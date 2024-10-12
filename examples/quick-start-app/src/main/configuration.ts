import { Autowired, Configuration, GenericApplicationContext } from '@electron-boot/framework'
import { MainWindow } from './windows/main.window'
import { Db } from './common/db'

@Configuration({
  imports: []
})
export class MainConfiguration {
  @Autowired()
  mainWindow: MainWindow | undefined

  async onReady(ctx: GenericApplicationContext) {
    await ctx.getAsync(Db, [ctx])
  }

  async onSocketReady() {
    this.mainWindow!.addListener('ready_to_show', () => {})
  }
}
