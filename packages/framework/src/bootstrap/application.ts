import { inspect } from "node:util";
import type { ILogger } from "@electron-boot/logger";
import { LoggerFactory } from "@electron-boot/logger";
import type { BootstrapOptions, IApplicationContext } from "../interface";
import { GenericApplicationContext } from "../context/generic.application.context";
import {
  bindContainer,
  clearBindContainer,
  listPreloadModule,
} from "../decorators/decorator.manager";
import { AspectService } from "../service/aspect.service";
import { EnvironmentService } from "../service/environment.service";
import { DecoratorService } from "../service/decorator.service";
import { ConfigService } from "../service/config.service";
import { SocketService } from "../service/socket.service";
import { LifecycleService } from "../service/lifecycle.service";
import { IpcService } from "../service/ipc.service";
import { EventService } from "../service/event.service";
import defaultConfig from "../config/config.default";

let stepIdx = 1;
export class Application {
  protected globalOptions: Partial<BootstrapOptions> = {};
  protected logger: ILogger = LoggerFactory.getLogger(Application);
  private applicationContext: IApplicationContext | undefined;

  private printStepDebugInfo(stepInfo: string) {
    this.logger.debug(`\n\nStep ${stepIdx++}: ${stepInfo}\n`);
  }

  public configure(options: BootstrapOptions = {}): this {
    this.globalOptions = options;
    return this;
  }

  private async prepareGlobalApplicationContext(): Promise<IApplicationContext> {
    this.printStepDebugInfo("Ready to create applicationContext");

    this.logger.debug(
      '[framework]: start "initializeGlobalApplicationContext"',
    );
    this.logger.debug(
      `[framework]: bootstrap options = ${inspect(this.globalOptions)}`,
    );

    // new applicationContext
    const applicationContext: IApplicationContext =
      this.globalOptions.applicationContext ?? new GenericApplicationContext();

    // bind moduleStore to DecoratorUtil
    this.logger.debug("[core]: delegate module map from DecoratorUtil");
    bindContainer(applicationContext);
    this.applicationContext = applicationContext;

    global["ELECTRON_APPLICATION_CONTEXT"] = applicationContext;

    this.printStepDebugInfo("Ready module detector");

    this.printStepDebugInfo("Binding inner service");
    // bind inner service
    applicationContext.bindClass(EnvironmentService);
    applicationContext.bindClass(AspectService);
    applicationContext.bindClass(DecoratorService);
    applicationContext.bindClass(ConfigService);
    applicationContext.bindClass(IpcService);
    applicationContext.bindClass(SocketService);
    applicationContext.bindClass(LifecycleService);
    applicationContext.bindClass(EventService);

    this.printStepDebugInfo("Binding preload module");

    // bind preload module
    if (
      this.globalOptions.preloadModules &&
      this.globalOptions.preloadModules.length
    ) {
      for (const preloadModule of this.globalOptions.preloadModules) {
        applicationContext.bindClass(preloadModule);
      }
    }

    this.printStepDebugInfo(
      "Init ConfigService, AspectService, DecoratorService",
    );
    // init default config
    const configService = applicationContext.get(ConfigService);
    configService.add([
      {
        default: defaultConfig,
      },
    ]);

    // init aop support
    applicationContext.get(AspectService, [applicationContext]);

    // init decorator service
    applicationContext.get(DecoratorService, [applicationContext]);

    this.printStepDebugInfo(
      "Load imports(component) and user code configuration module",
    );

    // load import module
    applicationContext.load([].concat(this.globalOptions.imports));
    this.printStepDebugInfo("Run applicationContext ready method");

    // bind user code module
    await applicationContext.ready();

    if (this.globalOptions.globalConfig) {
      if (Array.isArray(this.globalOptions.globalConfig)) {
        configService.add(this.globalOptions.globalConfig);
      } else {
        configService.addObject(this.globalOptions.globalConfig);
      }
    }

    this.printStepDebugInfo("Load config file");

    // merge config
    configService.load();

    this.logger.debug(
      "[core]: Current config = %j",
      configService.getConfiguration(),
    );

    // init ipc
    await applicationContext.getAsync(IpcService, [applicationContext]);

    // init state
    // await applicationContext.getAsync(StateService, [configService]);

    return applicationContext;
  }
  private async initializeGlobalApplicationContext(): Promise<IApplicationContext> {
    const applicationContext = await this.prepareGlobalApplicationContext();

    this.printStepDebugInfo("Init runtime");

    await applicationContext.getAsync(SocketService, [applicationContext]);

    this.printStepDebugInfo("Init lifecycle");

    // lifecycle support
    await applicationContext.getAsync(LifecycleService, [applicationContext]);

    this.printStepDebugInfo("Init preload modules");

    // some preload module init
    const modules = listPreloadModule();
    for (const module of modules) {
      // preload init context
      await applicationContext.getAsync(module,[applicationContext]);
    }

    this.printStepDebugInfo("End of initialize and start");

    return applicationContext;
  }
  private async destroyGlobalApplicationContext(
    applicationContext: IApplicationContext,
  ) {
    // stop lifecycle
    const lifecycleService =
      await applicationContext.getAsync(LifecycleService);
    await lifecycleService.stop();
    // stop applicationContext
    await applicationContext.stop();
    clearBindContainer();
    // clear applicationContext
    global["ELECTRON_APPLICATION_CONTEXT"] = null;
  }

  public async run(): Promise<IApplicationContext> {
    this.applicationContext = await this.initializeGlobalApplicationContext();
    return this.applicationContext;
  }

  public async stop(): Promise<void> {
    if (this.applicationContext) {
      await this.destroyGlobalApplicationContext(this.applicationContext);
    }
  }
  public getApplicationContext(): IApplicationContext {
    return this.applicationContext!;
  }
}
