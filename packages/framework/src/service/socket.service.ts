import { Init, Singleton } from "../decorators/definitions.decorator";
import { Autowired } from "../decorators/autowired.decorator";
import type { AspectService } from "./aspect.service";
import type { ConfigService } from "./config.service";
import type { DecoratorService } from "./decorator.service";
import type { IApplicationContext, ISocket } from "../interface";
import {
  getProviderUUId,
  listModule,
  SOCKET_KEY,
} from "../decorators/decorator.manager";
import type { LogFunctions } from "electron-log";
import Logger from "electron-log";

@Singleton()
export class SocketService {
  private logger: LogFunctions = Logger.scope(SocketService.constructor.name);
  @Autowired()
  aspectService!: AspectService;

  @Autowired()
  configService!: ConfigService;

  @Autowired()
  decoratorService!: DecoratorService;

  constructor(readonly applicationContext: IApplicationContext) {}

  private globalSocketList: Array<ISocket> = [];
  @Init()
  async init(): Promise<void> {
    const sockets: Array<new (...args) => any> = listModule(SOCKET_KEY);
    if (sockets.length) {
      for (const socket of sockets) {
        if (
          !this.applicationContext.registry.hasDefinition(
            getProviderUUId(socket),
          )
        ) {
          this.logger.debug(
            `[core]: Found socket "${socket.name}" but missing definition, skip initialize.`,
          );
          continue;
        }
        const socketInstance = await this.applicationContext.getAsync(socket);
        this.globalSocketList.push(socketInstance);
      }
    }

    await this.aspectService.loadAspect();
  }
  async run(): Promise<void> {
    for (const socket of this.globalSocketList) {
      // if enabled, just run socket
      if (socket.isEnable()) {
        // app init
        await socket.run();
        this.logger.debug(
          `[core]: Found socket "${socket.getName()}" and run.`,
        );
      }
    }
  }

  async stop(): Promise<void> {
    await Promise.all(
      Array.from(this.globalSocketList).map((socketInstance) => {
        return socketInstance.stop();
      }),
    );
  }
}
