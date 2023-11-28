import { ContextLoggerOptions, IGenericChildLogger, IGenericContextLogger, ILogger } from '../interface'

export class GenericContextLogger<CTX> implements IGenericContextLogger<CTX> {
  constructor(
    protected readonly ctx: CTX,
    protected readonly appLogger: ILogger | IGenericChildLogger,
    protected readonly options: ContextLoggerOptions = {} as ContextLoggerOptions
  ) {
    if ('getParentLogger' in this.appLogger) {
      this.appLogger = this.appLogger.getParentLogger()
    }
  }

  isDebugEnabled(): boolean {
    return this.appLogger.isDebugEnabled.apply(this.appLogger)
  }

  isTraceEnabled(): boolean {
    return this.appLogger.isTraceEnabled.apply(this.appLogger)
  }

  isInfoEnabled(): boolean {
    return this.appLogger.isInfoEnabled.apply(this.appLogger)
  }

  isWarnEnabled(): boolean {
    return this.appLogger.isWarnEnabled.apply(this.appLogger)
  }

  isErrorEnabled(): boolean {
    return this.appLogger.isErrorEnabled.apply(this.appLogger)
  }

  protected log(...args: any[]) {
    if (!['trace', 'debug', 'info', 'warn', 'error'].includes(args[0])) {
      args.unshift('info')
    }
    this.transformLog('log', args)
  }

  trace(...args: any[]) {
    this.transformLog('trace', args)
  }

  public debug(...args: any[]) {
    this.transformLog('debug', args)
  }

  public info(...args: any[]) {
    this.transformLog('info', args)
  }

  public warn(...args: any[]) {
    this.transformLog('warn', args)
  }

  public error(...args: any[]) {
    this.transformLog('error', args)
  }

  verbose(msg: any, ...args: any[]) {
    this.transformLog('verbose', args)
  }

  silly(msg: any, ...args: any[]) {
    this.transformLog('silly', args)
  }

  public getContext(): CTX {
    return this.ctx
  }

  private transformLog(level: string, args: any[]) {
    return (this.appLogger as any)[level].apply(this.appLogger, [
      ...args,
      {
        ctx: this.ctx
      }
    ])
  }
}
