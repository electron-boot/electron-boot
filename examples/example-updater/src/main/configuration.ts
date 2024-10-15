import { Autowired, Configuration, GenericApplicationContext } from '@electron-boot/framework'
import { MainWindow } from './windows/main.window'
import * as pouchdb from '@electron-boot/pouchdb'
import { DbService } from './service/db.service'
import * as updater from '@electron-boot/updater'

@Configuration({
  imports: [
    pouchdb,
    updater,
    {
      component: DbService
    }
  ]
})
export class MainConfiguration {
  @Autowired()
  mainWindow: MainWindow | undefined

  async onReady(_: GenericApplicationContext) {}

  async onSocketReady() {
    this.mainWindow!.addListener('ready_to_show', () => {})
  }
}
