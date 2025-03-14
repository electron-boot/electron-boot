declare module '@electron-boot/framework' {
  interface IConfig {
    pouchdb?: PouchdbConfig
  }
}
// ExtendConfig 扩展的配置
export type ExtendConfig = {
  name: string // 数据库名称
  path: string // 数据库存储地址
  docMaxByteLength: number // 文档最大字节长度
  docAttachmentMaxByteLength: number // 文档附件最大字节长度
}
// PouchdbConfig 数据库配置
export type PouchdbConfig = ExtendConfig & PouchDB.Configuration.DatabaseConfiguration
// CheckDoc 检查文档
export type CheckDoc<Model extends object = object> = PouchDB.Core.PostDocument<Model> | PouchDB.Core.PutDocument<Model>

// PutResponse 插入文档响应
export type PutResponse<Model extends object = object> = Model & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta

// dumpOptions 导出数据库配置
export type dumpOptions = {
  url: string
  username: string
  password: string
  cloudPath: string
}
