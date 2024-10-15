import {
  AllPublishOptions,
  ProgressInfo,
  PublishConfiguration,
  UpdateInfo,
} from 'builder-util-runtime';
import { UpdateDownloadedEvent } from 'electron-updater';

declare module '@electron-boot/framework' {
  interface IConfig {
    updater?: UpdaterConfig;
  }
}
// HotVersion 热更新版本信息
export interface HotVersion {
  version: string; // 版本号
  path: string; // 下载地址
}
// 热更新配置
export interface HotConfig extends PublishConfiguration {
  readonly url: string;
}
export interface UpdaterConfig {
  autoDownload?: boolean;
  allowDowngrade?: boolean;
  feedURL: AllPublishOptions;
  hotURL: HotConfig;
}
export type EventMap = {
  [key: string]: (...args: any[]) => void;
};
export type ElectronUpdaterEvent = {
  error: (err: Error, message: string) => void;
  'checking-for-update': () => void;
  'update-not-available': (info: UpdateInfo) => void;
  'update-available': (info: UpdateInfo) => void;
  'update-downloaded': (event: UpdateDownloadedEvent) => void;
  'download-progress': (info: ProgressInfo) => void;
  'update-cancelled': (info: UpdateInfo) => void;
  'appimage-filename-updated': (path: string) => void;
};
export type AppUpdaterEvent = {
  'update-hot-not-available': () => void; // 热更新检测无需更新
  'update-hot-available': () => void; // 热更新检测需要更新
} & ElectronUpdaterEvent;
