import { ChildLoggerOptions, ContextLoggerOptions, IGenericChildLogger, IGenericLogger } from '../interface'
import { GenericContextLogger } from './context-logger'

export class GenericChildLogger implements IGenericChildLogger {
  constructor(
    private readonly parentLogger: IGenericLogger,
    private readonly options: ChildLoggerOptions
  ) {}

  isDebugEnabled(): boolean {
    return this.parentLogger.isDebugEnabled.apply(this.parentLogger)
  }

  isTraceEnabled(): boolean {
    return this.parentLogger.isTraceEnabled.apply(this.parentLogger)
  }

  isInfoEnabled(): boolean {
    return this.parentLogger.isInfoEnabled.apply(this.parentLogger)
  }

  isWarnEnabled(): boolean {
    return this.parentLogger.isWarnEnabled.apply(this.parentLogger)
  }

  isErrorEnabled(): boolean {
    return this.parentLogger.isErrorEnabled.apply(this.parentLogger)
  }

  trace(...args: any[]) {
    this.transformLog('debug', args)
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

  public getParentLogger(): IGenericLogger {
    return this.parentLogger
  }

  public getLoggerOptions(): ChildLoggerOptions {
    return this.options
  }

  public createContextLogger<Ctx>(
    ctx: Ctx,
    options: ContextLoggerOptions = {} as ContextLoggerOptions
  ): GenericContextLogger<Ctx> {
    return new GenericContextLogger(ctx, this, {
      ...this.getLoggerOptions(),
      ...options
    })
  }

  private transformLog(level: string, args: any[]) {
    return (this.parentLogger as any)[level].apply(this.parentLogger, [...args])
  }

  write(...args: any[]): boolean {
    return this.parentLogger.write(...args)
  }
}
