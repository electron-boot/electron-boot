import type {
  GenericServerOptions,
  ProgressInfo,
  UpdateInfo,
} from "builder-util-runtime";
import type { UpdateDownloadedEvent } from "electron-updater";

declare module "@electron-boot/framework" {
  interface IConfig {
    updater?: UpdaterConfig;
  }
}
declare module "http" {
  interface OutgoingHttpHeaders {
    version: string | undefined;
  }
}

export interface UpdaterConfig {
  autoDownload?: boolean;
  allowDowngrade?: boolean;
  feedURL: GenericServerOptions;
}
export interface BootUpdateInfo extends UpdateInfo {
  type: "major" | "minor" | "patch";
}
export interface BootUpdateDownloaded
  extends UpdateDownloadedEvent,
    BootUpdateInfo {}
export type EventMap = {
  [key: string]: (...args: any[]) => void;
};
export type ElectronUpdaterEvent = {
  error: (err: Error, message: string) => void;
  "checking-for-update": () => void;
  "update-not-available": (info: BootUpdateInfo) => void;
  "update-available": (info: BootUpdateInfo) => void;
  "update-downloaded": (event: BootUpdateDownloaded) => void;
  "download-progress": (info: ProgressInfo) => void;
  "update-cancelled": (info: BootUpdateInfo) => void;
  "appimage-filename-updated": (path: string) => void;
};
export type AppUpdaterEvent = {
  "update-hot-not-available": () => void; // 热更新检测无需更新
  "update-hot-available": () => void; // 热更新检测需要更新
} & ElectronUpdaterEvent;
