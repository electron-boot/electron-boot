import { Singleton } from "../decorators/definitions.decorator";
import { camel } from "radash";
import {
  CONTROLLER_KEY,
  EVENT_KEY,
  getClassMetadata,
  getProviderUUId,
  listModule,
} from "../decorators/decorator.manager";
import type {
  ControllerMetadata,
  DynamicEventInfo,
  EventInfo,
  EventMetadata,
} from "../interface";
import { DuplicateEventError } from "../error/framework";

@Singleton()
export class EventService {
  private isReady = false;
  private eventMap = new Map<string, EventInfo>();

  constructor() {}
  /**
   * 初始化
   * @private
   */
  private async analyze() {
    // 获取所有的controller模块
    const controllerModules = listModule(CONTROLLER_KEY);
    for (const module of controllerModules) {
      // 控制器参数
      const controllerOption: ControllerMetadata = getClassMetadata(
        CONTROLLER_KEY,
        module,
      );
      // 添加控制器
      this.addController(module, controllerOption);
    }
  }

  /**
   * 添加控制器
   * @param controllerClazz 控制器实例
   * @param controllerMetadata
   */
  public addController(
    controllerClazz: any,
    controllerMetadata: ControllerMetadata,
  ): void {
    const id = getProviderUUId(controllerClazz);
    /**
     * 所有的路由参数列表
     */
    const eventMetadata: EventMetadata[] = getClassMetadata(
      EVENT_KEY,
      controllerClazz,
    );
    /**
     * 如果routerInfos有数据
     */
    if (eventMetadata && typeof eventMetadata[Symbol.iterator] === "function") {
      for (const event of eventMetadata) {
        let controllerName = "";
        if (controllerMetadata.customName) {
          controllerName = controllerMetadata.customName;
        } else {
          controllerName = camel(controllerMetadata.controllerName);
        }

        let eventName = "";
        if (event.customName) {
          eventName = event.customName;
        } else {
          eventName = camel(event.eventName);
        }

        eventName = [controllerName, eventName].join("/");
        // 路由信息
        const data: EventInfo = {
          id,
          eventName: `/${eventName}`,
          handlerName: `${controllerMetadata.controllerName}.${event.eventName}`,
          method: event.eventName,
        };
        this.checkDuplicateAndPush(data.eventName, data);
      }
    }
  }

  /**
   * 添加路由
   * @param path
   * @param routerFunction
   * @param routerInfoOption
   */
  public addRouter(
    path: string,
    routerFunction: (...args) => void,
    routerInfoOption: DynamicEventInfo,
  ): void {
    this.checkDuplicateAndPush(
      "/",
      Object.assign(routerInfoOption, {
        method: routerFunction,
        url: path,
      }),
    );
  }

  /**
   * get event list
   */
  public async getEventList(): Promise<Map<string, EventInfo>> {
    if (!this.isReady) {
      await this.analyze();
      this.isReady = true;
    }
    return this.eventMap;
  }

  /**
   * check duplicate and push
   * @param event
   * @param eventInfo
   * @private
   */
  private checkDuplicateAndPush(event: string, eventInfo: EventInfo) {
    if (this.eventMap.has(event)) {
      throw new DuplicateEventError(
        event,
        this.eventMap.get(event)!.handlerName,
        eventInfo.handlerName,
      );
    }
    this.eventMap.set(event, eventInfo);
  }
}
