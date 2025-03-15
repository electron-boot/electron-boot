declare module '@electron-boot/framework' {
  interface IConfig {
    pouchdb?: PouchdbConfig
  }
}
/**
 * 扩展配置
 */
export type ExtendConfig = {
  name?: string // 数据库名称
  path?: string // 数据库存储地址
  docMaxByteLength?: number // 文档最大字节长度
  docAttachmentMaxByteLength?: number // 文档附件最大字节长度
}
/**
 * PouchDB 配置
 */
export type PouchdbConfig = ExtendConfig & PouchDB.Configuration.DatabaseConfiguration
/**
 * 检查文档是否合法参数
 */
export type CheckDoc<Model extends object = object> = PouchDB.Core.PostDocument<Model> | PouchDB.Core.PutDocument<Model>

/**
 * 数据库响应
 */
export type PutResponse<Model extends object = object> = Model & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta

/**
 * 数据库迁移选项
 */
export type MigrateOptions = {
  url: string
  username: string
  password: string
  cloudPath: string
}
