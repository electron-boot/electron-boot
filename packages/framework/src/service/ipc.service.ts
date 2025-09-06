import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { ipcMain } from 'electron'
import type { Context, IApplicationContext, ISocket } from '../interface'
import { Socket } from '../decorators/socket.decorator'
import { Autowired } from '../decorators/autowired.decorator'
import type { ControllerService } from './controller.service'
import { RequestApplicationContext } from '../context/request.application.context'
import type { LogFunctions } from 'electron-log'
import Logger from 'electron-log'

@Socket()
export class IpcService implements ISocket {
  // 默认的上下文
  private defaultContext = {}
  private _isEnable: boolean = true
  private logger: LogFunctions = Logger.scope(IpcService.constructor.name)
  constructor(readonly applicationContext: IApplicationContext) {}

  @Autowired()
  protected controllerService!: ControllerService

  getName(): string {
    return 'ipc'
  }

  isEnable(): boolean {
    return this._isEnable
  }

  private createAnonymousContext(extendCtx?: Context): Context {
    const ctx = extendCtx || Object.create(this.defaultContext)
    if (ctx.startTime) {
      ctx.startTime = Date.now()
    }
    if (!ctx.requestContext) {
      ctx.requestContext = new RequestApplicationContext(ctx, this.applicationContext)
      ctx.requestContext.ready()
    }
    ctx.setAttr = (key: string, value: any) => {
      ctx.requestContext.setAttr(key, value)
    }
    ctx.getAttr = <T>(key: string): T => {
      return ctx.requestContext.getAttr(key)
    }
    ctx.hasAttr = (key: string): boolean => {
      return ctx.requestContext.hasAttr(key)
    }
    ctx.requestContext.registerObject('ctx', ctx)
    return ctx
  }

  async run(): Promise<void> {
    const eventMap = await this.controllerService.getIpcList()
    for (const eventInfo of Array.from(eventMap.values())) {
      const channel = eventInfo.channel

      const ipcResult = async (event: any, data: any[]) => {
        const ctx = this.createAnonymousContext()
        ctx.setAttr('event', event)
        if (!data) data = []
        const controller = await ctx.requestContext.getAsync<any>(eventInfo.id)
        let result
        if (typeof eventInfo.method !== 'string') {
          result = await eventInfo.method(...data)
        } else {
          result = await controller[eventInfo.method].call(controller, ...data)
        }
        return result
      }
      this.logger.debug('register ipc channel: %s', channel)
      // ipc main on
      ipcMain.on(channel, async (event: IpcMainEvent, ...data: any[]) => {
        const result = await ipcResult(event, data)
        event.returnValue = result
        event.reply(`${channel}`, result)
      })
      // ipc main handle
      ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...data: any[]) => {
        return await ipcResult(event, data)
      })
    }
  }

  async stop(): Promise<void> {
    return Promise.resolve(undefined)
  }
}
