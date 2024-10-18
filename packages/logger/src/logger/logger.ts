import * as util from "node:util";
import { format } from "winston";
import type { Format } from "logform";
import type { Transport } from "../winston/logger";
import { WinstonLogger } from "../winston/logger";
import type {
  IGenericChildLogger,
  IGenericContextLogger,
  IGenericLogger,
  Level,
  LoggerOptions,
} from "../interface";
import { formatLevel, isPlainObject } from "../utils";
import { ORIGIN_ARGS, ORIGIN_ERROR } from "../constant";
import { displayCommonMessage, displayLabels } from "../fomat";

export const LogLevels: { [key: string]: number } = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
  all: 6,
};
export class GenericLogger extends WinstonLogger implements IGenericLogger {
  private readonly defaultLabel: string;

  private readonly defaultMetadata?: Record<string, unknown>;

  protected _level: Level;

  protected _metadata: Record<string, unknown> | undefined;

  setLevel(level: Level): void {
    this._level = formatLevel(level);
  }

  getLevel(): Level {
    return this._level;
  }

  set metadata(metadata: Record<string, unknown>) {
    this._metadata = metadata;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }

  isDebugEnabled(): boolean {
    return LogLevels[this.level] >= LogLevels.debug;
  }

  isTraceEnabled(): boolean {
    return LogLevels[this.level] >= LogLevels.trace;
  }

  isInfoEnabled(): boolean {
    return LogLevels[this._level] >= LogLevels.info;
  }

  isWarnEnabled(): boolean {
    return LogLevels[this._level] >= LogLevels.warn;
  }

  isErrorEnabled(): boolean {
    return LogLevels[this._level] >= LogLevels.error;
  }

  constructor(options: LoggerOptions = {} as LoggerOptions) {
    super(
      Object.assign(options, {
        levels: LogLevels,
      }),
    );
    // 设置日志等级
    this._level = formatLevel(options.level ?? "info");
    // 设置默认的标签
    this.defaultLabel = options.name || "";
    // 元数据
    this.defaultMetadata = options.metadata || {};
    // 配置当前日志主体
    this.configure({
      format: this.getDefaultFormat(),
      exitOnError: false,
    });
  }

  protected getDefaultFormat(): Format {
    return format.combine(
      format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss,SSS",
      }),
      format.splat(),
      displayCommonMessage({
        defaultLabel: this.defaultLabel,
        defaultMeta: this.defaultMetadata,
        target: this,
      }),
      displayLabels(),
    );
  }

  protected log(level: string, ...args: any[]): void {
    // 拦截器，只有当要输出的日志等级小于当前日志等级的时候才进行记录，否则跳过
    if (LogLevels[level] > LogLevels[this._level]) return;
    const originArgs = [...args];
    let meta;
    let msg;
    if (args.length > 1 && isPlainObject(args[args.length - 1])) {
      meta = args.pop();
    } else {
      meta = {};
    }
    const last = args.pop();
    if (last instanceof Error) {
      msg = util.format(...args, last);
      meta[ORIGIN_ERROR] = last;
    } else {
      msg = util.format(...args, last);
    }
    meta[ORIGIN_ARGS] = originArgs;
    return super.log(level, msg, meta);
  }

  trace(...args: any[]): void {
    this.log("trace", ...args);
  }

  debug(...args: any[]): void {
    this.log("debug", ...args);
  }

  info(...args: any[]): void {
    this.log("info", ...args);
  }

  warn(...args: any[]): void {
    this.log("warn", ...args);
  }

  error(...args: any[]): void {
    this.log("error", ...args);
  }

  add(transport: Transport): void {
    super.add(transport);
  }

  remove(transport: Transport): void {
    super.remove(transport);
  }

  write(...args: any[]): boolean {
    if (
      (args.length === 1 && typeof args[0] !== "object") ||
      !args[0]["level"]
    ) {
      // 这里必须要用 none
      return super.log.apply(this, ["trace", ...args, { ignoreFormat: true }]);
    }
    return super.write.apply(this, args);
  }

  close(): void {
    return super.close();
  }

  createChildLogger(
    options: LoggerOptions = {} as LoggerOptions,
  ): IGenericChildLogger {
    console.log(options);
    return null as any;
  }

  createContextLogger<Ctx>(ctx: Ctx): IGenericContextLogger<Ctx> {
    console.log(ctx);
    return null as any;
  }
}
