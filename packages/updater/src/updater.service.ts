import {
  GenericApplicationContext,
  Provide,
  Scope,
  ScopeEnum,
} from '@electron-boot/framework';
import {
  AppUpdaterEvent,
  ElectronUpdaterEvent,
  HotVersion,
  UpdaterConfig,
} from './types';
import { autoUpdater, UpdateCheckResult } from 'electron-updater';
import type TypedEmitter from 'typed-emitter';
import { app } from 'electron';
import EventEmitter = require('node:events');
import * as fs from 'node:fs';
import * as path from 'node:path';
import axios, { get } from 'axios';
import { ProgressInfo } from 'builder-util-runtime';
@Provide()
@Scope(ScopeEnum.Singleton)
export class UpdaterService extends (EventEmitter as new () => TypedEmitter<AppUpdaterEvent>) {
  private isReady: boolean;
  private appPath: string;
  private token: string;
  private hot: boolean;
  constructor(ctx: GenericApplicationContext, config: UpdaterConfig) {
    super();
    const that = this;
    if (this.isReady) return;
    // 如果配置了autoDownload则使用autoDownload，没有配置则不管
    if (config.autoDownload) autoUpdater.autoDownload = config.autoDownload;
    if (config.allowDowngrade)
      autoUpdater.allowDowngrade = config.allowDowngrade;
    [
      'error',
      'checking-for-update',
      'update-not-available',
      'update-available',
      'update-downloaded',
      'download-progress',
      'update-cancelled',
      'appimage-filename-updated',
    ].forEach((value: keyof ElectronUpdaterEvent) => {
      autoUpdater.on(value, () => {
        const args = arguments;
        if (value === 'update-not-available') {
          // 读取本地环境的版本信息
          fs.readFile(
            path.join(this.appPath, './hot-version.json'),
            {
              encoding: 'utf-8',
            },
            (err, data) => {
              if (!err) {
                const currentIncrementUpdate = JSON.parse(data);
                get(config.hotURL.url, {
                  headers: {
                    Authorization: this.token,
                  },
                })
                  .then((res: axios.AxiosResponse<HotVersion>) => {
                    const remoteVersion = res.data.version;
                    const localVersion = currentIncrementUpdate.version;
                    // 如果版本不一致
                    if (remoteVersion != localVersion) {
                      this.hot = true;
                      // 下载远程app
                      const startTime = Date.now();
                      get(res.data.path, {
                        responseType: 'blob',
                        headers: {
                          Authorization: this.token,
                        },
                        onDownloadProgress: progressEvent => {
                          const endTime = Date.now();
                          const timeTaken = (endTime - startTime) / 1000; // 转换为秒
                          const speed = progressEvent.loaded / timeTaken;
                          this.emit('download-progress', {
                            total: progressEvent.total,
                            percent:
                              (progressEvent.loaded / progressEvent.total) *
                              100,
                            bytesPerSecond: speed,
                            transferred: progressEvent.loaded,
                          } as ProgressInfo);
                        },
                      }).then(res => {
                        const filename = res.headers['content-disposition'];
                        fs.writeFile(
                          path.join(app.getPath('userData'), filename),
                          res.data,
                          err => {
                            if (err) {
                              this.emit('error', err, err.message);
                            }
                          }
                        );
                      });
                    } else {
                      this.emit.apply(that, args);
                    }
                  })
                  .catch(reason => {
                    this.emit('error', new Error(reason), reason);
                  });
              }
            }
          );
        } else {
          that.emit.apply(that, args);
        }
      });
    });
    this.isReady = true;
    this.appPath = app.getAppPath();
  }
  set forceDevUpdateConfig(val: boolean) {
    autoUpdater.forceDevUpdateConfig = val;
  }
  get forceDevUpdateConfig(): boolean {
    return autoUpdater.forceDevUpdateConfig;
  }
  get updateConfigPath(): string {
    return autoUpdater.updateConfigPath;
  }
  set updateConfigPath(value: string) {
    autoUpdater.updateConfigPath = value;
  }
  async checkForUpdates(): Promise<UpdateCheckResult> {
    return await autoUpdater.checkForUpdates();
  }
  addAuthHeader(value: string) {
    this.token = value;
    autoUpdater.addAuthHeader(value);
  }
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean) {
    if (!this.hot) {
      autoUpdater.quitAndInstall(isSilent, isForceRunAfter);
    }
  }
}
