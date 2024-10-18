import { EventEmitter } from "events";
import type { BrowserWindow } from "electron";
import type { ILogger } from "@electron-boot/logger";

/**
 * AbstractWindow 是一个抽象类，继承自 EventEmitter，用于表示应用程序中的窗口对象。
 * 子类需要实现 logger, _id, 和 _win 属性。
 *
 * 属性:
 *   - logger: 用于记录日志的 ILogger 实例，需由子类实现。
 *   - _id: 窗口的唯一标识符，需由子类实现。
 *   - _win: BrowserWindow 实例，表示当前窗口，需由子类实现。
 *
 * 方法:
 *   - send(channel: string, ...args: any[]): 向窗口的 webContents 发送 IPC 消息。如果窗口已销毁或其 webContents 已销毁，记录警告日志。
 *   - close(): 关闭当前窗口。
 */
export abstract class AbstractWindow extends EventEmitter {
  protected abstract logger: ILogger;
  protected abstract _id: number;
  protected abstract _win: BrowserWindow;

  send(channel: string, ...args: any[]): void {
    if (this._win) {
      if (this._win.isDestroyed() || this._win.webContents.isDestroyed()) {
        this.logger.warn(
          `Sending IPC message to channel '${channel}' for window that is destroyed`,
        );
        return;
      }
      try {
        this._win.webContents.send(channel, ...args);
      } catch (error) {
        this.logger.warn(
          `Error sending IPC message to channel '${channel}' of window ${this._id}: ${error}`,
        );
      }
    }
  }

  close(): void {
    this._win?.close();
  }
}
