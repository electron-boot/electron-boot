import { Init, Singleton } from "../decorators/definitions.decorator";
import { Autowired } from "../decorators/autowired.decorator";
import type { AppInfo, IConfigService } from "../interface";
import type { EnvironmentService } from "./environment.service";
import { readdirSync, statSync } from "fs";
import { basename, join } from "path";
import { isFunction } from "../utils/types.util";
import { InvalidConfigError } from "../error/framework";
import { extend, safelyGet } from "../utils/object.util";
import { app } from "electron";

interface ConfigMergeInfo {
  value: any;
  env: string;
  extraPath?: string;
}

@Singleton()
export class ConfigService implements IConfigService {
  private envDirMap: Map<string, Set<any>> = new Map();
  private aliasMap = {
    prod: "production",
    unittest: "test",
  };
  private configMergeOrder: Array<ConfigMergeInfo> = [];
  protected configuration = {};
  protected isReady = false;
  protected externalObject: Record<string, unknown>[] = [];
  protected appInfo!: AppInfo;
  protected configFilterList: Array<
    (config: Record<string, any>) => Record<string, any>
  > = [];

  @Autowired()
  protected environmentService!: EnvironmentService;

  @Init()
  protected init(): void {
    this.appInfo = {
      runnerPath: this.environmentService.isDevelopment()
        ? process.cwd()
        : app.getAppPath(),
      name: app.getName(),
      version: app.getVersion(),
      HOME: app.getPath("home"),
      env: this.environmentService.getCurrentEnvironment(),
    };
  }

  public add(configFilePaths: any[]): void {
    for (const dir of configFilePaths) {
      if (typeof dir === "string") {
        if (/\.\w+$/.test(dir)) {
          // file
          const env = this.getConfigEnv(dir);
          const envSet = this.getEnvSet(env);
          envSet.add(dir);
          if (this.aliasMap[env]) {
            this.getEnvSet(this.aliasMap[env]).add(dir);
          }
        } else {
          // directory
          const fileStat = statSync(dir);
          if (fileStat.isDirectory()) {
            const files = readdirSync(dir);
            this.add(
              files.map((file) => {
                return join(dir, file);
              }),
            );
          }
        }
      } else {
        // object add
        for (const env in dir) {
          this.getEnvSet(env).add(dir[env]);
          if (this.aliasMap[env]) {
            this.getEnvSet(this.aliasMap[env]).add(dir[env]);
          }
        }
      }
    }
  }

  public addObject(obj: Record<string, unknown>, reverse = false): void {
    if (this.isReady) {
      obj = this.runWithFilter(obj);

      if (!obj) {
        return;
      }
      this.configMergeOrder.push({
        env: "default",
        extraPath: "",
        value: obj,
      });
      if (reverse) {
        this.configuration = extend(true, obj, this.configuration);
      } else {
        extend(true, this.configuration, obj);
      }
    } else {
      this.externalObject.push(obj);
    }
  }

  private getEnvSet(env): Set<any> {
    if (!this.envDirMap.has(env)) {
      this.envDirMap.set(env, new Set());
    }
    return this.envDirMap.get(env)!;
  }

  private getConfigEnv(configFilePath): string {
    // parse env
    const configFileBaseName = basename(configFilePath);
    const splits = configFileBaseName.split(".");
    const suffix = splits.pop()!;
    if (suffix !== "js" && suffix !== "ts") {
      return suffix;
    }
    return splits.pop()!;
  }

  public load(): void {
    if (this.isReady) return;
    // get default
    const defaultSet = this.getEnvSet("default");
    // get current set
    const currentEnvSet = this.getEnvSet(
      this.environmentService.getCurrentEnvironment(),
    );
    // merge set
    const target = {};
    const defaultSetLength = defaultSet.size;
    for (const [idx, filename] of [...defaultSet, ...currentEnvSet].entries()) {
      let config: Record<string, any> = this.loadConfig(filename);
      if (isFunction(config)) {
        config = config.apply(null, [this.appInfo, target]);
      }

      if (!config) {
        continue;
      }

      config = this.runWithFilter(config);

      if (!config) {
        continue;
      }

      this.configMergeOrder.push({
        env:
          idx < defaultSetLength
            ? "default"
            : this.environmentService.getCurrentEnvironment(),
        extraPath: filename,
        value: config,
      });

      extend(true, target, config);
    }
    if (this.externalObject.length) {
      for (let externalObject of this.externalObject) {
        if (externalObject) {
          externalObject = this.runWithFilter(externalObject);
          if (!externalObject) {
            continue;
          }
          extend(true, target, externalObject);
          this.configMergeOrder.push({
            env: "default",
            extraPath: "",
            value: externalObject,
          });
        }
      }
    }
    this.configuration = target;
    this.isReady = true;
  }

  public getConfiguration(configKey?: string): any {
    if (configKey) {
      return safelyGet(configKey, this.configuration);
    }
    return this.configuration;
  }

  public getConfigMergeOrder(): Array<ConfigMergeInfo> {
    return this.configMergeOrder;
  }

  private loadConfig(
    configFilename,
  ): (...args) => any | Record<string, unknown> {
    let exports =
      typeof configFilename === "string"
        ? require(configFilename)
        : configFilename;

    // if es module
    if (exports && exports.__esModule) {
      if (exports && exports.default) {
        if (Object.keys(exports).length > 1) {
          throw new InvalidConfigError(
            `${configFilename} should not have both a default export and named export`,
          );
        }
        exports = exports.default;
      }
    }

    return exports;
  }

  public clearAllConfig(): void {
    this.configuration = {};
  }

  public clearConfigMergeOrder(): void {
    this.configMergeOrder.length = 0;
  }

  /**
   * add a config filter
   * @param filter
   */
  public addFilter(
    filter: (config: Record<string, any>) => Record<string, any>,
  ): void {
    this.configFilterList.push(filter);
  }

  protected runWithFilter(config: Record<string, any>): Record<string, any> {
    for (const filter of this.configFilterList) {
      config = filter(config);
    }
    return config;
  }

  public getAppInfo(): AppInfo {
    return this.appInfo;
  }
}
