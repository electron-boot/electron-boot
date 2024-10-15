import { AppInfo, IConfig } from '@electron-boot/framework';
import { UpdaterConfig } from './types';

export const pouchdbConfig = (appInfo: AppInfo): IConfig => {
  return {
    updater: {} as UpdaterConfig,
  };
};
