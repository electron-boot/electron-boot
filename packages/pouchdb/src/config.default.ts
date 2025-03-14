import type { AppInfo, IConfig } from '@electron-boot/framework'
import type { PouchdbConfig } from './types'

export const pouchdbConfig = (appInfo: AppInfo): IConfig => {
  return {
    pouchdb: {
      name: 'electron-pouchdb',
      path: appInfo.HOME
    } as PouchdbConfig
  }
}
