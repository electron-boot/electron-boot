import { EventEmitter } from 'events'
import type { BaseWindow,WebContentsView } from 'electron'
import type { LogFunctions } from 'electron-log'


export abstract class AbstractWindow extends EventEmitter {
  protected logger: LogFunctions | null = null
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
