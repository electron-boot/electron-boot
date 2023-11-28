import { createLogger, Logger, transport } from 'winston'

export const EmptyLogger = createLogger().constructor as any

export type Transport = transport

export type WinstonInnerLogger = Omit<
  Logger,
  | 'error'
  | 'warn'
  | 'debug'
  | 'info'
  | 'level'
  | 'log'
  | 'write'
  | 'close'
  | 'add'
  | 'remove'
  | 'verbose'
  | 'silly'
  | 'isDebugEnabled'
  | 'isInfoEnabled'
  | 'isWarnEnabled'
  | 'isErrorEnabled'
>

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class WinstonLogger extends EmptyLogger {
  constructor(options) {
    super(options)
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface,@typescript-eslint/no-unsafe-declaration-merging
export interface WinstonLogger extends WinstonInnerLogger {
  // empty
}
