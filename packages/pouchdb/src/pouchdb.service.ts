import type { GenericApplicationContext } from '@electron-boot/framework'
import { Singleton } from '@electron-boot/framework'
import PouchDB from 'pouchdb'
import type { CheckDoc, MigrateOptions, PouchdbConfig, PutResponse } from './types'
import * as path from 'node:path'
import replicationStream from 'pouchdb-replication-stream'
import fs from 'node:fs'
import { WebDav } from './webdav'
import { load } from './load'

// 注册插件
PouchDB.plugin(replicationStream.plugin)
PouchDB.plugin({
  loadIt: load
})
PouchDB.adapter('writableStream', replicationStream.adapters.writableStream)

@Singleton()
export class PouchdbService {
  /**
   * 文档最大字节长度
   */
  readonly docMaxByteLength: number = 2 * 1024 * 1024 // 2M
  /**
   * 文档附件最大字节长度
   */
  readonly docAttachmentMaxByteLength: number = 20 * 1024 * 1024 // 20M
  /**
   * 配置信息
   */
  readonly config!: PouchdbConfig
  /**
   * 数据库实例
   */
  private pouchDB: PouchDB.Database
  /**
   * 构造函数
   * @param _ctx 上下文
   * @param config 配置
   */
  constructor(
    private ctx: GenericApplicationContext,
    config: PouchdbConfig
  ) {
    if (!config.path || !config.name) {
      throw new Error('pouchdb config error')
    }
    fs.existsSync(config.path) || fs.mkdirSync(config.path)
    const dbname = path.join(config.path, config.name)
    if (config.docMaxByteLength) this.docMaxByteLength = config.docMaxByteLength
    if (config.docAttachmentMaxByteLength) this.docAttachmentMaxByteLength = config.docAttachmentMaxByteLength
    this.config = config
    this.pouchDB = new PouchDB(dbname, config)
  }
  /**
   * 获取数据库文档id
   * @param name 插件名称
   * @param id 原始文档id
   * @returns 当前插件id
   */
  getDocID(name: string, id: string): string {
    return `${name}/${id}`
  }
  /**
   * 替换id，返回原始id
   * @param name 插件名称
   * @param id 插件id
   * @returns 原始id
   */
  replaceDocID(name: string, id: string): string {
    return id.replace(name + '/', '')
  }
  /**
   * 返回错误信息
   * @param name 错误名称
   * @param message 错误信息
   * @returns
   */
  errorInfo(name: string, message: string): PouchDB.Core.Error {
    return {
      name,
      message
    }
  }
  /**
   * 检查文档字节长度是否大于最大字节长度
   * @param doc 文档内容
   * @returns 是否大于最大字节长度
   */
  private checkDocSize<Model extends object = object>(doc: CheckDoc<Model>): PouchDB.Core.Error | false {
    if (Buffer.byteLength(JSON.stringify(doc)) > this.docMaxByteLength) {
      return this.errorInfo('exception', `doc max size ${this.docMaxByteLength / 1024 / 1024} M`)
    }
    return false
  }
  /**
   * put 插入文档
   * @param name 插件名称
   * @param doc 文档信息
   * @param strict 是否严格检查
   * @returns 错误信息 | 文档信息
   */
  async put<Model extends object = object>(
    name: string,
    doc: PouchDB.Core.PutDocument<Model>,
    strict = true
  ): Promise<PouchDB.Core.Error | PouchDB.Core.Response> {
    if (strict) {
      const error = this.checkDocSize(doc)
      if (error) return Promise.reject(error)
    }
    doc._id = this.getDocID(name, doc._id!)
    try {
      const result: PouchDB.Core.Response = await this.pouchDB.put(doc)
      doc._id = result.id = this.replaceDocID(name, result.id)
      return result
    } catch (e: any) {
      doc._id = this.replaceDocID(name, doc._id)
      return { id: doc._id, name: e.name, error: !0, message: e.message }
    }
  }
  /**
   * get 获取文档
   * @param name 插件名称
   * @param id 文档id
   * @returns 文档信息
   */
  async get<Model extends object = object>(name: string, id: string): Promise<PutResponse<Model> | PouchDB.Core.Error> {
    try {
      const result: PutResponse<Model> = await this.pouchDB.get(this.getDocID(name, id))
      result._id = this.replaceDocID(name, result._id)
      return result
    } catch (e: any) {
      return { id, name: e.name, error: !0, message: e.message }
    }
  }
  /**
   * 删除文档
   * @param name 插件名称
   * @param doc 文档信息
   * @returns 错误信息 | 文档信息
   */
  async remove<Model extends object = object>(
    name: string,
    doc: string | PouchDB.Core.Document<Model>
  ): Promise<PouchDB.Core.Response | PouchDB.Core.Error> {
    try {
      let target
      if ('object' === typeof doc) {
        target = doc
        if (!target._id || 'string' !== typeof target._id) {
          return this.errorInfo('exception', 'doc _id error')
        }
        target._id = this.getDocID(name, target._id)
      } else {
        if ('string' !== typeof doc) {
          return this.errorInfo('exception', 'param error')
        }
        target = await this.pouchDB.get(this.getDocID(name, doc))
      }
      const result: PouchDB.Core.Response = await this.pouchDB.remove(target)
      target._id = result.id = this.replaceDocID(name, result.id)
      return result
    } catch (e: any) {
      if ('object' === typeof doc) {
        doc._id = this.replaceDocID(name, doc._id)
      }
      return this.errorInfo(e.name, e.message)
    }
  }
  /**
   * 批量插入文档
   * @param name 插件名称
   * @param docs 文档数组
   * @returns 文档数组 | 错误信息
   */
  async bulkDocs<Model extends object = object>(
    name: string,
    docs: Array<PouchDB.Core.PutDocument<Model>>
  ): Promise<Array<PouchDB.Core.Response | PouchDB.Core.Error> | PouchDB.Core.Error> {
    let result
    try {
      if (!Array.isArray(docs)) return this.errorInfo('exception', 'not array')
      if (docs.find(e => !e._id)) return this.errorInfo('exception', 'doc not _id field')
      if (new Set(docs.map(e => e._id)).size !== docs.length) return this.errorInfo('exception', '_id value exists as')
      for (const doc of docs) {
        const err = this.checkDocSize(doc)
        if (err) return err
        doc._id = this.getDocID(name, doc._id!)
      }
      result = await this.pouchDB.bulkDocs(docs)
      result = result.map((res: any) => {
        res.id = this.replaceDocID(name, res.id)
        return res.error
          ? {
              id: res.id,
              name: res.name,
              error: true,
              message: res.message
            }
          : res
      })
      docs.forEach(doc => {
        doc._id = this.replaceDocID(name, doc._id!)
      })
    } catch (_e) {}
    return result
  }
  /**
   * 查找文档
   * @param name 插件名称
   * @param key 查找key
   * @returns 文档数组 | 错误信息
   */
  async allDocs<Model extends object = object>(
    name: string,
    key: string | Array<string>
  ): Promise<PouchDB.Core.AllDocsResponse<Model> | PouchDB.Core.AllDocsWithKeysResponse<Model> | PouchDB.Core.Error> {
    const config: any = { include_docs: true }
    if (key) {
      if ('string' === typeof key) {
        config.startkey = this.getDocID(name, key)
        config.endkey = config.startkey + '￰'
      } else {
        if (!Array.isArray(key)) return this.errorInfo('exception', 'param only key(string) or keys(Array[string])')
        config.keys = key.map(key => this.getDocID(name, key))
      }
    } else {
      config.startkey = this.getDocID(name, '')
      config.endkey = config.startkey + '￰'
    }
    let result: PouchDB.Core.AllDocsResponse<Model> | PouchDB.Core.AllDocsWithKeysResponse<Model> | PouchDB.Core.Error =
      {}
    try {
      result = await this.pouchDB.allDocs<Model>(config)
      result.rows.forEach((res: any) => {
        if (!res.error && res.doc) {
          res.doc._id = this.replaceDocID(name, res.doc._id)
        }
      })
    } catch (_e) {}
    return result
  }
  /**
   * 导出数据库
   * @param config 导出数据库配置
   */
  async exportDB(config: MigrateOptions): Promise<void> {
    const webdavClient = new WebDav(config)
    await webdavClient.export(this.pouchDB)
  }
  /**
   * 导入数据库
   * @param config 导入数据库配置
   */
  async importDB(config: MigrateOptions): Promise<void> {
    const webdavClient = new WebDav(config)
    await this.pouchDB.destroy()
    const syncDb = new PouchdbService(this.ctx, this.config)
    this.pouchDB = syncDb.pouchDB
    await webdavClient.import(this.pouchDB)
  }

  /**
   * 上传文档附件
   * @param name 插件名称
   * @param docId 文档ID
   * @param attachment 附件数据，支持 Buffer 或 Uint8Array 格式
   * @param type 附件的 MIME 类型
   * @returns 成功返回文档响应信息，失败返回错误信息
   */
  async postAttachment(
    name: string,
    docId: string,
    attachment: Buffer | Uint8Array,
    type: string
  ): Promise<PouchDB.Core.Response | PouchDB.Core.Error> {
    // 将输入数据转换为 Buffer 格式
    const buffer = Buffer.isBuffer(attachment) ? attachment : Buffer.from(attachment)
    // 检查附件大小是否超过限制
    if (buffer.byteLength > this.docAttachmentMaxByteLength) {
      return this.errorInfo('exception', `attachment data up to ${this.docAttachmentMaxByteLength / 1024 / 1024}M`)
    }
    try {
      // 生成带命名空间的文档 ID
      const docKey = this.getDocID(name, docId)
      const doc: any = { _id: docKey }
      try {
        // 尝试获取已存在的文档以获取修订版本号
        const existingDoc = await this.pouchDB.get(docKey)
        doc._rev = existingDoc._rev
      } catch (err: any) {
        // 如果文档不存在则忽略错误，其他错误则抛出
        if (err.name !== 'not_found') throw err
      }
      // 设置文档的附件信息
      doc._attachments = { 0: { data: buffer, content_type: type } }
      // 保存文档
      const result = await this.pouchDB.put(doc)
      // 移除文档 ID 中的命名空间前缀
      result.id = this.replaceDocID(name, result.id)
      return result
    } catch (e: any) {
      // 发生错误时返回错误信息
      return this.errorInfo(e.name, e.message)
    }
  }
  /**
   * 获取文档附件
   * @param name 插件名称
   * @param docId 文档ID
   * @param len 附件长度，默认为 '0'
   * @returns 成功返回 Blob、Buffer 或错误信息，失败返回错误信息
   */
  async getAttachment(name: string, docId: string, len = '0'): Promise<Blob | Buffer | PouchDB.Core.Error> {
    try {
      return await this.pouchDB.getAttachment(this.getDocID(name, docId), len)
    } catch (e: any) {
      return this.errorInfo(e.name, e.message)
    }
  }
}
