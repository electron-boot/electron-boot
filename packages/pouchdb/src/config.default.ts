import { AppInfo, IConfig } from '@electron-boot/framework';
import { PouchdbConfig } from './types';

export const pouchdbConfig = (appInfo: AppInfo): IConfig => {
  return {
    pouchdb: {
      name: 'pouchdb',
      path: appInfo.HOME,
    } as PouchdbConfig,
  };
};
