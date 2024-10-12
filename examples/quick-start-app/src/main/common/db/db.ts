import { Init, Provide, ScopeEnum, Scope, ApplicationContext } from '@electron-boot/framework'

declare module '@electron-boot/framework' {
  interface IConfig {
    database?: DatabaseConfig
  }
}
// DatabaseConfig 数据库配置
export interface DatabaseConfig {
  path: string
  docContentLength: number
  docAttachmentLength: number
}

// 数据库模块
@Provide()
@Scope(ScopeEnum.Singleton)
export class Db {
  @ApplicationContext()
  private data: any
  @Init()
  Init() {
    console.log(this.data)
    console.log('进来了')
  }
}
