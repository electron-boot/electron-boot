import { Autowired, Configuration, GenericApplicationContext } from '@electron-boot/framework'
import { MainWindow } from './windows/main.window'
import * as pouchdb from '@electron-boot/pouchdb'
import { PouchDBServices } from '@electron-boot/pouchdb'

@Configuration({
  imports: [pouchdb]
})
export class MainConfiguration {
  @Autowired()
  mainWindow: MainWindow | undefined

  async onReady(ctx: GenericApplicationContext) {
    let db = await ctx.getAsync(PouchDBServices, [ctx])
    var post = await db.post({
      content: 'Hello World!'
    })
    console.log(post)
  }

  async onSocketReady() {
    this.mainWindow!.addListener('ready_to_show', () => {})
  }
}
