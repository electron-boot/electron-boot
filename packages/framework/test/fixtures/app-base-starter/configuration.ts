import { Autowired, Configuration } from '../../../src';
import * as defaultConfig from './config/config.default';
import { MainWindow } from './window/main.window';

@Configuration({
  importConfigs: [
    {
      default: defaultConfig,
    },
  ],
})
export class MainConfiguration {
  @Autowired()
  mainWindow!: MainWindow;

  async onSocketReady() {
    this.mainWindow.show();
  }
}
