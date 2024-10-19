import { AbstractWindow, Init, Singleton } from '../../../../src';
import { ILogger, LoggerFactory } from '@electron-boot/logger';
import { app, BrowserWindow, dialog, screen, Size } from 'electron';
import { join } from 'path';

@Singleton()
export class MainWindow extends AbstractWindow {
  _id = 1;
  _win: BrowserWindow | null = null;
  protected logger: ILogger = LoggerFactory.getLogger();
  @Init()
  async init() {
    const size: Size = screen?.getPrimaryDisplay()?.workAreaSize || {
      width: 1080,
      height: 720,
    };
    let width = Math.ceil(size.width * 0.82);
    let height = Math.ceil(size.height * 0.82);
    let minWidth = Math.ceil(size.width * 0.5);
    let minHeight = Math.ceil(size.height * 0.55);

    // Ensure width and height are even numbers
    if (width % 2 !== 0) width += 1;
    if (height % 2 !== 0) height += 1;
    if (minHeight % 2 !== 0) minHeight += 1;
    if (minWidth % 2 !== 0) minWidth += 1;

    this._win = new BrowserWindow({
      show: false,
      hasShadow: true,
      // Reorder titleBarStyle and titleBarOverlay based on platform logic
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      titleBarOverlay: process.platform === 'win32',
      width,
      height,
      minWidth,
      minHeight,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    });
    // 加载页面
    try {
      if (!app.isPackaged) {
        await this._win.loadURL('https://baidu.com');
      } else {
        await this._win.loadFile(join(__dirname, '../renderer/index.html'));
      }
    } catch (error) {
      this.logger.error('Error loading URL or file:', error);
      dialog
        .showMessageBox({
          type: 'error',
          title: 'Error loading URL or file',
          message: `An error occurred while trying to load the URL or file:
${error}`,
        })
        .then((_result) => {
          app.quit();
        });
    }
  }

  show() {
    this._win?.show();
  }
}
