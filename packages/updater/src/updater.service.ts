import type { GenericApplicationContext } from "@electron-boot/framework";
import { Provide, Scope, ScopeEnum } from "@electron-boot/framework";
import type {
  AppUpdaterEvent,
  BootUpdateDownloaded,
  ElectronUpdaterEvent,
  UpdaterConfig,
} from "./types";
import type { UpdateCheckResult } from "electron-updater";
import { autoUpdater } from "electron-updater";
import type TypedEmitter from "typed-emitter";
import { app } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AxiosProgressEvent, AxiosResponse } from "axios";
import axios from "axios";
import type { GenericServerOptions, ProgressInfo } from "builder-util-runtime";
import { ElectronAppAdapter } from "electron-updater/out/ElectronAppAdapter";
import { load } from "js-yaml";
import EventEmitter from "node:events";
import { isEmpty } from "radash";

@Provide()
@Scope(ScopeEnum.Singleton)
export class UpdaterService extends (EventEmitter as new () => TypedEmitter<AppUpdaterEvent>) {
  private token!: string;
  private hot!: boolean;
  private app = new ElectronAppAdapter();
  private _appUpdateConfigPath!: string;
  constructor(_ctx: GenericApplicationContext, config: UpdaterConfig) {
    super();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    // 给header设置version
    autoUpdater.requestHeaders = {
      version: app.getVersion(),
    };
    autoUpdater.logger = null;
    // 如果配置了autoDownload则使用autoDownload，没有配置则不管
    if (config.autoDownload) autoUpdater.autoDownload = config.autoDownload;
    if (config.allowDowngrade)
      autoUpdater.allowDowngrade = config.allowDowngrade;
    [
      "error",
      "checking-for-update",
      "update-not-available",
      "update-available",
      "update-downloaded",
      "download-progress",
      "update-cancelled",
      "appimage-filename-updated",
    ].forEach((value: string) => {
      autoUpdater.on(value as keyof ElectronUpdaterEvent, function () {
        // eslint-disable-next-line prefer-rest-params
        const args = Array.from(arguments);
        if (value === "update-not-available") {
          const appUpdaterConfig = load(
            fs.readFileSync(that._appUpdateConfigPath!, { encoding: "utf-8" }),
          ) as GenericServerOptions;
          let platform: string = "";
          switch (process.platform) {
            case "darwin":
              platform = "mac";
              break;
            case "win32":
              platform = "win";
              break;
            case "linux":
              platform = "linux";
          }
          if (isEmpty(platform))
            throw new Error(
              `this platform ${process.platform} can not use hot updater`,
            );
          try {
            axios
              .get<string, AxiosResponse<string>>(
                path.join(appUpdaterConfig.url, `hot-latest-${platform}.yml`),
                {
                  responseType: "text",
                  headers: {
                    Authorization: that.token,
                    version: app.getVersion(),
                  },
                },
              )
              .then((res) => {
                const downloadInfo = load(res.data) as BootUpdateDownloaded;
                const remoteVersion = downloadInfo.version;
                const localVersion = that.app.version;
                // 如果版本不一致
                if (remoteVersion != localVersion) {
                  // 下载远程app
                  const startTime = Date.now();
                  axios
                    .get(downloadInfo.downloadedFile, {
                      responseType: "blob",
                      headers: {
                        Authorization: that.token,
                      },
                      onDownloadProgress: (
                        progressEvent: AxiosProgressEvent,
                      ) => {
                        const endTime = Date.now();
                        const timeTaken = (endTime - startTime) / 1000; // 转换为秒
                        const speed = progressEvent.loaded / timeTaken;
                        that.emit("download-progress", {
                          total: progressEvent.total,
                          percent:
                            (progressEvent.loaded / progressEvent.total!) * 100,
                          bytesPerSecond: speed,
                          transferred: progressEvent.loaded,
                        } as ProgressInfo);
                      },
                    })
                    .then((res) => {
                      that.hot = true;
                      const filename = res.headers["content-disposition"];
                      fs.writeFile(
                        path.join(app.getPath("userData"), filename),
                        res.data,
                        (err) => {
                          if (err) {
                            that.emit("error", err, err.message);
                          }
                        },
                      );
                    });
                } else {
                  that.emit.apply(that, args as any);
                }
              })
              .catch((reason) => {
                that.emit("error", new Error(reason), reason);
              });
          } catch (e: any) {
            that.emit("error", new Error(e), e);
          }
        } else {
          that.emit.apply(that, args as any);
        }
      });
    });
  }

  set forceDevUpdateConfig(val: boolean) {
    autoUpdater.forceDevUpdateConfig = val;
  }
  get forceDevUpdateConfig(): boolean {
    return autoUpdater.forceDevUpdateConfig;
  }
  get updateConfigPath(): string | null {
    return this._appUpdateConfigPath;
  }
  set updateConfigPath(value: string) {
    this._appUpdateConfigPath = value;
  }
  async checkForUpdates(): Promise<UpdateCheckResult | null> {
    if (this._appUpdateConfigPath == null) {
      this._appUpdateConfigPath = this.app.appUpdateConfigPath;
    }
    autoUpdater.updateConfigPath = this._appUpdateConfigPath;
    return await autoUpdater.checkForUpdates();
  }
  addAuthHeader(value: string): void {
    this.token = value;
    autoUpdater.addAuthHeader(value);
  }
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void {
    if (!this.hot) {
      autoUpdater.quitAndInstall(isSilent, isForceRunAfter);
    } else {
      // 1.替换包内的asar
      // 2.修改package.json版本
    }
  }
}
