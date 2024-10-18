import type { AppInfo, IConfig } from "@electron-boot/framework";
import type { UpdaterConfig } from "./types";

export const updaterConfig = (_appInfo: AppInfo): IConfig => {
  return {
    updater: {} as UpdaterConfig,
  };
};
