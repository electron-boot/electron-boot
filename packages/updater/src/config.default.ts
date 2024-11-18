import type { AppInfo, IConfig } from '@electron-boot/framework'

export const updaterConfig = (_appInfo: AppInfo): IConfig => {
  return {
    updater: {}
  }
}
