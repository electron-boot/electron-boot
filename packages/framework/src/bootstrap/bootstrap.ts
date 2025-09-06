import type { LogFunctions } from "electron-log";
import Logger from "electron-log";
import type { BootstrapOptions, IApplicationContext } from "../interface";
import { Application } from "./application";

export class Bootstrap {
  protected static application: Application | null;
  protected static configured = false;
  protected static logger: LogFunctions = Logger.scope(Bootstrap.constructor.name);
  public static configure(options: BootstrapOptions = {}): typeof Bootstrap {
    this.configured = true;
    this.getApplication().configure(options);
    return this;
  }

  public static getApplication(): Application {
    if (!this.application) {
      this.application = new Application();
    }
    return this.application;
  }

  public static reset(): void {
    this.configured = false;
    this.application = null;
  }

  /**
   * run application
   */
  public static async run(): Promise<IApplicationContext> {
    if (!this.configured) {
      this.configure();
    }

    process.once("SIGINT", this.onSignal.bind(this, "SIGINT"));
    // kill(3) Ctrl-\
    process.once("SIGQUIT", this.onSignal.bind(this, "SIGQUIT"));
    // kill(15) default
    process.once("SIGTERM", this.onSignal.bind(this, "SIGTERM"));

    process.once("exit", this.onExit.bind(this));

    this.uncaughtExceptionHandler = this.uncaughtExceptionHandler.bind(this);
    process.on("uncaughtException", this.uncaughtExceptionHandler);

    this.unhandledRejectionHandler = this.unhandledRejectionHandler.bind(this);
    process.on("unhandledRejection", this.unhandledRejectionHandler);

    try {
      const applicationContext = await this.getApplication().run();
      this.logger.info("Application started");
      return applicationContext;
    } catch (e) {
      this.logger.error(e);
      process.exit(1);
    }
  }

  /**
   * stop application
   */
  public static async stop(): Promise<void> {
    await this.getApplication().stop();
    process.off("uncaughtException", this.uncaughtExceptionHandler);
    process.off("unhandledRejection", this.unhandledRejectionHandler);
    this.reset();
  }
  /**
   * on bootstrap receive an exit signal
   * @param signal
   */
  private static async onSignal(signal: NodeJS.Signals) {
    this.logger.info("receive signal %s, closing", signal);
    try {
      await this.stop();
      this.logger.info("close done, exiting with code:0");
      process.exit(0);
    } catch (err) {
      this.logger.error("close with error: ", err);
      process.exit(1);
    } finally {
    }
  }
  /**
   * on bootstrap process exit
   * @param code
   */
  private static onExit(code: NodeJS.Signals) {
    this.logger.info("exit with code:%s", code);
  }

  private static uncaughtExceptionHandler(err: Error) {
    if (!(err instanceof Error)) {
      err = new Error(String(err));
    }
    if (err.name === "Error") {
      err.name = "unhandledExceptionError";
    }
    this.logger.error(err);
  }

  private static unhandledRejectionHandler(err: any) {
    if (!(err instanceof Error)) {
      const newError = new Error(String(err));
      // err maybe an object, try to copy the name, message and stack to the new error instance
      if (err) {
        if (err.name) newError.name = err.name;
        if (err.message) newError.message = err.message;
        if (err.stack) newError.stack = err.stack;
      }
      err = newError;
    }
    if (err.name === "Error") {
      err.name = "unhandledRejectionError";
    }
    this.logger.error(err);
  }

  public static getApplicationContext(): IApplicationContext {
    return this.getApplication().getApplicationContext();
  }
}
