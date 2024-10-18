import type { InjectionConfigurationOptions } from "../decorators/configuration.decorator";
import type { IApplicationContext } from "../interface";

export class FunctionalConfiguration {
  private readyHandler;
  private stopHandler;
  private configLoadHandler;
  private serverReadyHandler;
  private options: InjectionConfigurationOptions;

  constructor(options: InjectionConfigurationOptions) {
    this.options = options;
    this.readyHandler = () => {};
    this.stopHandler = () => {};
    this.configLoadHandler = () => {};
    this.serverReadyHandler = () => {};
  }

  onConfigLoad(
    configLoadHandler:
      | ((container: IApplicationContext) => any)
      | IApplicationContext,
  ): this {
    if (typeof configLoadHandler === "function") {
      this.configLoadHandler = configLoadHandler;
    } else {
      return this.configLoadHandler(configLoadHandler);
    }
    return this;
  }

  onReady(
    readyHandler:
      | ((container: IApplicationContext) => void)
      | IApplicationContext,
  ): this {
    if (typeof readyHandler === "function") {
      this.readyHandler = readyHandler;
    } else {
      return this.readyHandler(readyHandler);
    }
    return this;
  }

  onServerReady(
    serverReadyHandler:
      | ((container: IApplicationContext) => void)
      | IApplicationContext,
  ): this {
    if (typeof serverReadyHandler === "function") {
      this.serverReadyHandler = serverReadyHandler;
    } else {
      return this.serverReadyHandler(serverReadyHandler);
    }
    return this;
  }

  onStop(
    stopHandler:
      | ((container: IApplicationContext) => void)
      | IApplicationContext,
  ): this {
    if (typeof stopHandler === "function") {
      this.stopHandler = stopHandler;
    } else {
      return this.stopHandler(stopHandler);
    }
    return this;
  }

  getConfigurationOptions(): InjectionConfigurationOptions {
    return this.options;
  }
}

export const createConfiguration = (
  options: InjectionConfigurationOptions,
): FunctionalConfiguration => {
  return new FunctionalConfiguration(options);
};
