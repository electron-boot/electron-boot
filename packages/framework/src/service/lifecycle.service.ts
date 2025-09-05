import { Init, Singleton } from '../decorators/definitions.decorator'
import type { LogFunctions } from 'electron-log'
import Logger from 'electron-log'
import { Autowired } from '../decorators/autowired.decorator'
import type { IApplicationContext, ILifeCycle, IObjectLifeCycle } from '../interface'
import { CONFIGURATION_KEY, listModule } from '../decorators/decorator.manager'
import type { ConfigService } from './config.service'
import type { SocketService } from './socket.service'
import { FunctionalConfiguration } from '../functional/configuration'

@Singleton()
export class LifecycleService {
  private logger: LogFunctions = Logger.scope(LifecycleService.constructor.name)

  @Autowired()
  protected configService!: ConfigService

  @Autowired()
  protected socketService!: SocketService

  constructor(readonly applicationContext: IApplicationContext) {}

  @Init()
  protected async init(): Promise<void> {
    // run lifecycle
    const cycles = listModule(CONFIGURATION_KEY) as Array<{
      target: any
      instance?: any
    }>
    this.logger.debug(`[core]: Found Configuration length = ${cycles.length}`)

    const lifecycleInstanceList: any[] = []
    for (const cycle of cycles) {
      // 普通类写法
      this.logger.debug(`[core]: Lifecycle init`, cycle.target.name)
      cycle.instance = await this.applicationContext.getAsync<ILifeCycle>(cycle.target, [this.applicationContext])
      cycle.instance && lifecycleInstanceList.push(cycle)
    }

    // bind object lifecycle
    await Promise.all([
      this.runObjectLifeCycle(lifecycleInstanceList, 'onBeforeObjectCreated'),
      this.runObjectLifeCycle(lifecycleInstanceList, 'onObjectCreated'),
      this.runObjectLifeCycle(lifecycleInstanceList, 'onObjectInit'),
      this.runObjectLifeCycle(lifecycleInstanceList, 'onBeforeObjectDestroy')
    ])

    // exec onConfigLoad()
    await this.runApplicationContextLifeCycle(lifecycleInstanceList, 'onConfigLoad', configData => {
      if (configData) {
        this.configService.addObject(configData)
      }
    })

    // exec onReady()
    await this.runApplicationContextLifeCycle(lifecycleInstanceList, 'onReady')

    // exec runtime.run()
    await this.socketService.run()

    // exec onSocketReady()
    await this.runApplicationContextLifeCycle(lifecycleInstanceList, 'onSocketReady')
  }

  public async stop(): Promise<void> {
    // stop lifecycle
    const cycles = listModule(CONFIGURATION_KEY) || []

    for (const cycle of cycles.reverse()) {
      let inst: IObjectLifeCycle = await this.applicationContext.getAsync<IObjectLifeCycle>(cycle.target)
      if (cycle.target instanceof FunctionalConfiguration) {
        // 函数式写法
        inst = cycle.target
      } else {
        inst = await this.applicationContext.getAsync<ILifeCycle>(cycle.target)
      }

      await this.runApplicationContextLifeCycle(inst, 'onStop')
    }

    // stop socket
    await this.socketService.stop()
  }

  private async runApplicationContextLifeCycle(
    lifecycleInstanceOrList: any[] | IObjectLifeCycle,
    lifecycle: string,
    resultHandler?: (result: any) => void
  ) {
    if (Array.isArray(lifecycleInstanceOrList)) {
      for (const cycle of lifecycleInstanceOrList) {
        if (typeof cycle.instance[lifecycle] === 'function') {
          this.logger.debug(`[core]: Lifecycle run ${cycle.instance.constructor.name} ${lifecycle}`)
          const result = await cycle.instance[lifecycle](this.applicationContext)
          if (resultHandler) {
            resultHandler(result)
          }
        }
      }
    } else {
      if (typeof lifecycleInstanceOrList[lifecycle] === 'function') {
        this.logger.debug(`[core]: Lifecycle run ${lifecycleInstanceOrList.constructor.name} ${lifecycle}`)
        const result = await lifecycleInstanceOrList[lifecycle](this.applicationContext)
        if (resultHandler) {
          resultHandler(result)
        }
      }
    }
  }

  private async runObjectLifeCycle(lifecycleInstanceList: any[], lifecycle: string) {
    for (const cycle of lifecycleInstanceList) {
      if (typeof cycle.instance[lifecycle] === 'function') {
        this.logger.debug(`[core]: Lifecycle run ${cycle.instance.constructor.name} ${lifecycle}`)
        return this.applicationContext[lifecycle](cycle.instance[lifecycle].bind(cycle.instance))
      }
    }
  }
}
