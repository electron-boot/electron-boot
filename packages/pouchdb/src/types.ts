declare module '@electron-boot/framework' {
  interface IConfig {
    pouchdb?: PouchdbConfig;
  }
}
// ExtendConfig 扩展的配置
export type ExtendConfig = {
  name: string; // 数据库名称
  path: string; // 数据库存储地址
};
// PouchdbConfig 数据库配置
export type PouchdbConfig = ExtendConfig &
  PouchDB.Configuration.DatabaseConfiguration;
