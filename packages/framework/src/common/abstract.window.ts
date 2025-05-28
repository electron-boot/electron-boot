import { EventEmitter } from 'events'
import type { BaseWindow,WebContentsView } from 'electron'
import type { ILogger } from '@electron-boot/logger'


export abstract class AbstractWindow extends EventEmitter {
  protected logger: ILogger | null = null
  protected _win: BaseWindow | null = null
  protected _view: WebContentsView  | null = null
  get win(): BaseWindow | null {
    return this._win
  }
  get view(): WebContentsView | null {
    return this._view
  }
  abstract createWindow(): BaseWindow;
}
