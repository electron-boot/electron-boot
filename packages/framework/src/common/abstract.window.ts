import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { ILogger } from '@electron-boot/logger';

export abstract class AbstractWindow extends EventEmitter {
  protected abstract logger: ILogger;
  protected _id: number;
  protected _win: BrowserWindow;

  send(channel: string, ...args: any[]): void {
    if (this._win) {
      if (this._win.isDestroyed() || this._win.webContents.isDestroyed()) {
        this.logger.warn(
          `Sending IPC message to channel '${channel}' for window that is destroyed`
        );
        return;
      }
      try {
        this._win.webContents.send(channel, ...args);
      } catch (error) {
        this.logger.warn(
          `Error sending IPC message to channel '${channel}' of window ${this._id}: ${error}`
        );
      }
    }
  }

  close(): void {
    this._win?.close();
  }
}
