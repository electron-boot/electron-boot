import { Autowired, Configuration } from '@electron-boot/framework'
import { MainWindow } from './windows/main.window'

@Configuration({
  imports: []
})
export class MainConfiguration {
  @Autowired()
  mainWindow: MainWindow | undefined

  async onSocketReady() {
    this.mainWindow!.addListener('ready_to_show', () => {})
  }
}
