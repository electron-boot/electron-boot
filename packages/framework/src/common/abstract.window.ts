import { EventEmitter } from 'events'
import type { BaseWindow } from 'electron'
import type { ILogger } from '@electron-boot/logger'

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
  protected logger: ILogger | null = null
  protected _id: number | null = null
  protected _win: BaseWindow | null = null
  protected ready: null | Promise<boolean> = null
  protected async createWindow(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  /**
   * 显示窗口
   */
  async show(): Promise<void> {
    // 创建窗口
    await this.createWindow()
    // 显示窗口
    if (this._win) {
      // 等待窗口创建完毕
      if (this.ready) await this.ready
      // 显示窗口
      this._win?.show()
    }
  }

  hide(): void {
    this._win?.hide()
  }
  close(): void {
    this._win?.close()
  }
}
