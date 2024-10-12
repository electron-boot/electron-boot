import { Init, Singleton } from '../decorators/definitions.decorator';
import { Autowired } from '../decorators/autowired.decorator';
import { AspectService } from './aspect.service';
import { ConfigService } from './config.service';
import { DecoratorService } from './decorator.service';
import { IApplicationContext, ISocket } from '../interface';
import {
  getProviderUUId,
  listModule,
  SOCKET_KEY,
} from '../decorators/decorator.manager';
import { ILogger, LoggerFactory } from '@electron-boot/logger';

@Singleton()
export class SocketService {
  private logger: ILogger = LoggerFactory.getLogger(SocketService);
  @Autowired()
  aspectService: AspectService;

  @Autowired()
  configService: ConfigService;

  @Autowired()
  decoratorService: DecoratorService;

  constructor(readonly applicationContext: IApplicationContext) {}

  private globalSocketList: Array<ISocket> = [];
  @Init()
  async init() {
    const sockets: Array<new (...args) => any> = listModule(SOCKET_KEY);
    if (sockets.length) {
      for (const socket of sockets) {
        if (
          !this.applicationContext.registry.hasDefinition(
            getProviderUUId(socket)
          )
        ) {
          this.logger.debug(
            `[core]: Found socket "${socket.name}" but missing definition, skip initialize.`
          );
          continue;
        }
        const socketInstance = await this.applicationContext.getAsync(socket);
        this.globalSocketList.push(socketInstance);
      }
    }

    await this.aspectService.loadAspect();
  }
  async run() {
    for (const socket of this.globalSocketList) {
      // if enabled, just run socket
      if (socket.isEnable()) {
        // app init
        await socket.run();
        this.logger.debug(
          `[core]: Found socket "${socket.getName()}" and run.`
        );
      }
    }
  }

  async stop() {
    await Promise.all(
      Array.from(this.globalSocketList).map(socketInstance => {
        return socketInstance.stop();
      })
    );
  }
}
