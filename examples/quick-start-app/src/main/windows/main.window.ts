import { AbstractWindow, Init, Singleton } from '@electron-boot/framework'
import { ILogger, LoggerFactory } from '@electron-boot/logger'
import { app, BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'

export interface MainWindowOptions extends BrowserWindowConstructorOptions {}
@Singleton()
export class MainWindow extends AbstractWindow {
  protected logger: ILogger = LoggerFactory.getLogger()

  @Init()
  async init() {
    this._win = new BrowserWindow({
      show: false,
      hasShadow: true,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      titleBarOverlay: process.platform === 'win32' ? true : false,
      width: 800,
      height: 600,
      minWidth: 600,
      minHeight: 400,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })
    if (!app.isPackaged) {
      this._win.loadURL(process.env['ELECTRON_RENDERER_URL']!)
    } else {
      this._win.loadFile(join(__dirname, '../renderer/index.html'))
    }
    this._win.addListener('ready-to-show', () => {
      this._win.show()
    })
  }
}
