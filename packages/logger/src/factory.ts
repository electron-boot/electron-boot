import { format, Logform, transports } from 'winston'
import {
  LoggerFactoryConfig,
  ILogger,
  ConsoleAppenderOptions,
  LoggerTransformableInfo,
  LoggerCustomInfoHandler,
  LoggerOptions,
  LoggerTransportOptions,
  ColorizeOptions,
  IGenericLogger,
  FileAppenderOptions,
  RotateFileAppenderOptions
} from './interface'
import { Transport } from './winston/logger'
import { formatLevel, template } from './utils'
import { GenericLogger } from './logger'
import { ConsoleTransportOptions, FileTransportOptions } from 'winston/lib/winston/transports'
import DailyRotateFile, { DailyRotateFileTransportOptions } from 'winston-daily-rotate-file'

export class LoggerFactory {
  // 自定义日志信息处理器
  #customInfoHandler: LoggerCustomInfoHandler = info => info

  // 默认单个日志配置
  private defaultConfigOptions: LoggerOptions = {
    level: 'info',
    name: 'rootLogger',
    lazyLoad: false,
    metadata: {},
    transportRef: ['Console']
  }

  private defaultConfig: LoggerFactoryConfig = {
    properties: {
      LOG_HOME: process.env.LOG_HOME || process.cwd(),
      FILE_NAME: process.env.FILE_NAME || process.env.APP_NAME || 'log4app'
    },
    transports: {
      Console: {
        type: 'Console',
        pattern: '${timestamp} ${LEVEL} ${pid} ${labelText} ${message}'
      }
    },
    loggers: []
  }

  // 日志工厂整体配置
  private config: LoggerFactoryConfig = {}

  // 延迟加载的日志配置
  private lazyConfigs: Map<string, LoggerOptions> = new Map()

  // 已经创建过的transport
  private transports: Map<string, Transport> = new Map()

  // 已经创建过的日志
  private loggers: Map<string, ILogger> = new Map()

  constructor() {
    // 设置当前配置记录
    this.config = Object.assign(true, {}, this.defaultConfig)
    // 根据传入参数进行创建transport
    for (const name in this.config.transports) {
      this.createTransport(name, this.config.transports[name])
    }
    // 初始化日志
    for (const options of this.config.loggers!) {
      if (options.lazyLoad) {
        if (!this.lazyConfigs.has(<string>options.name)) {
          delete options.lazyLoad
          this.lazyConfigs.set(options.name!, options)
        }
      } else {
        this.createLogger(options.name!, options)
      }
    }
  }

  /**
   * 创建ConsoleTransport
   * @param name 名称
   * @param config 配置
   * @private
   */
  private createConsoleTransport(name: string, config: ConsoleAppenderOptions) {
    const consoleTransport = new transports.Console({
      level: formatLevel('all'),
      format: this.getDefaultFormat(config)
    } as ConsoleTransportOptions)
    this.transports.set(name, consoleTransport)
  }

  private createFileTransport(name: string, config: FileAppenderOptions) {
    const fileTransport = new transports.File({
      ...config,
      format: this.getDefaultFormat(config)
    } as FileTransportOptions)
    this.transports.set(name, fileTransport)
  }

  private createRotateFileTransport(name: string, config: RotateFileAppenderOptions) {
    const rotateFileTransport = new DailyRotateFile({
      ...config,
      format: this.getDefaultFormat(config)
    } as DailyRotateFileTransportOptions)
    this.transports.set(name, rotateFileTransport)
  }

  /**
   * 获取日志格式化
   * @param options
   * @private
   */
  private getDefaultFormat(options?: LoggerTransportOptions): Logform.Format {
    if (options?.type === 'Console') {
      if (typeof options.colorize === 'undefined') {
        options.colorize = true
      }
      const colorize = typeof options.colorize === 'boolean'
      const colorizeOptions = !colorize
        ? (options.colorize as ColorizeOptions)
        : options.colorize
        ? {
            all: true,
            colors: {
              none: 'reset',
              error: 'red',
              trace: 'reset',
              warn: 'yellow',
              info: 'reset',
              verbose: 'reset',
              debug: 'blue',
              silly: 'reset',
              all: 'reset'
            }
          }
        : {}
      return format.combine(
        this.getDefaultPrint(options),
        options.colorize ? format.colorize(colorizeOptions) : format.simple()
      )
    }
    return format.combine(this.getDefaultPrint(options))
  }

  private getDefaultPrint(options?: LoggerTransportOptions) {
    return format.printf(info => {
      if (info.ignoreFormat) {
        return info.message
      }
      const newInfo = this.#customInfoHandler(info as LoggerTransformableInfo)
      const printInfo = newInfo.format || options?.format || this.getDefaultPrintFormat(options)
      return printInfo(newInfo || (info as LoggerTransformableInfo))
    })
  }

  private getDefaultPrintFormat(options?: LoggerTransportOptions) {
    return function (info: LoggerTransformableInfo) {
      const pattern =
        options && options.pattern ? options.pattern : '${timestamp} ${LEVEL} ${pid} ${labelText}${message}'
      return template(pattern, info)
    }
  }

  /**
   * 创建日志
   * @param name
   * @param options
   * @private
   */
  private createLogger(name: string, options: LoggerOptions): ILogger {
    const logger = new GenericLogger(options)
    for (const tr of options.transportRef) {
      if (!this.transports.has(tr)) {
        throw new Error(`appender ${tr} not found`)
      }
      const transport = this.transports.get(tr)!
      logger.add(transport)
    }
    this.loggers.set(name, logger)
    return logger
  }

  /**
   * 重新配置方法
   * @param config
   */
  public configure(config: LoggerFactoryConfig) {
    // 新的配置信息
    const newConfig = Object.assign(true, this.defaultConfig, config)
    // 循环销毁
    this.transports.forEach((transport: Transport, name, map) => {
      ;(transport as any)?.['parent']?.remove(transport)
      transport.close?.()
      map.delete(name)
    })
    // 重新创建新的transport
    for (const transportsKey in newConfig.transports) {
      this.createTransport(transportsKey, newConfig.transports[transportsKey])
    }
    // 根据新配置更新已经创建的日志
    newConfig.loggers?.forEach(options => {
      this.updateLogger(options, <IGenericLogger>this.loggers.get(options.name!))
    })
  }

  private updateLogger(options: LoggerOptions, logger: IGenericLogger) {
    // 如果日志等级不一直则修复日志等级
    if (options.level !== formatLevel(logger.level)) {
      logger.level = options.level!
    }
    // 如果加载的元数据不一致则修改元数据
    if (options.metadata !== logger.metadata) {
      logger.metadata = options.metadata
    }
    // 重新设置transport
    options.transportRef?.forEach(tr => {
      logger.add(this.transports.get(tr)!)
    })
  }

  private createTransport(name: string, options: LoggerTransportOptions) {
    switch (options.type) {
      case 'Console':
        this.createConsoleTransport(name, options)
        break
      case 'File':
        this.createFileTransport(name, options)
        break
      case 'RotateFile':
        this.createRotateFileTransport(name, options)
        break
    }
  }

  /**
   * 获取日志
   * @param name 日志名称
   */
  public getLogger(name: string | any = 'rootLogger') {
    let logger = this.loggers.get(name)
    if (logger) {
      return logger
    }
    if (this.lazyConfigs.has(name)) {
      logger = this.createLogger(name, <LoggerOptions>this.lazyConfigs.get(name))
      this.lazyConfigs.delete(name)
    }
    if (!logger) {
      logger = this.createLogger(name, { ...this.defaultConfigOptions, name })
    }
    return logger
  }

  /**
   * 根据名称销毁已经创建的日志，如果没有传递名称，则全部销毁
   * @param name
   */
  public destroy(name?: string | any) {
    if (name && name.name) {
      name = name.name
    }
    if (name) {
      if (this.loggers.has(name)) {
        const logger = this.loggers.get(name) as GenericLogger
        logger.transports.forEach(t => logger.remove(t))
        this.loggers.delete(name)
      }
    } else {
      this.loggers.forEach((logger: ILogger, key) => {
        ;(logger as GenericLogger).transports.forEach(t => (logger as GenericLogger).remove(t))
        this.loggers.delete(key)
      })
    }
  }

  // ======================== 公开api========================

  private static instance: LoggerFactory

  private static getInstance() {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory()
    }
    return LoggerFactory.instance
  }

  public static configure(config: LoggerFactoryConfig = {}) {
    this.getInstance().configure(config)
  }

  static getLogger(name: string | any = 'rootLogger'): ILogger {
    if (name && name.name) {
      name = name.name
    }
    if (typeof name !== 'string') {
      throw new Error('name must be string or class')
    }
    return this.getInstance().getLogger(name)
  }

  static destroy(name?: string | any) {
    this.getInstance().destroy(name)
  }
}
