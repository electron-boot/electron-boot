import { createClient, type WebDAVClient } from 'webdav'
import type { MigrateOptions } from './types'
import MemoryStream from 'memorystream'
import path from 'node:path'

/**
 * WebDav 数据库迁移
 */
export class WebDav {
  private client: WebDAVClient
  constructor(private options: MigrateOptions) {
    this.client = createClient(options.url, {
      username: options.username,
      password: options.password
    })
  }
  /**
   * 判断是否连接成功
   * @returns 是否连接成功
   */
  async isReady(): Promise<boolean> {
    try {
      return await this.client.exists('/')
    } catch (_e) {
      throw new Error('WebDAV 连接失败')
    }
  }
  /**
   * 导出数据库
   * @param dbInstance 数据库实例
   * @returns 是否备份成功
   */
  async export(dbInstance: PouchDB.Database): Promise<void> {
    try {
      const result = await this.client.exists(path.dirname(this.options.cloudPath))
      if (!result) {
        await this.client.createDirectory(path.dirname(this.options.cloudPath))
      }
    } catch (e) {
      throw new Error('WebDav目录创建出错:' + e)
    }
    const ws = new MemoryStream()
    dbInstance.dump(ws, {
      filter: (doc: { _attachments: any }) => {
        // attachment 文档导出有问题，
        return !doc._attachments
      }
    })

    return new Promise((resolve, reject) => {
      ws.pipe(this.client.createWriteStream(this.options.cloudPath, {}, () => {}))
        .on('finish', () => {
          console.log('WebDav 备份完成')
          resolve()
        })
        .on('error', err => {
          reject(err)
        })
    })
  }

  /**
   * 导入数据库
   * @param dbInstance 数据库实例
   * @returns 是否导入成功
   */
  async import(dbInstance: PouchDB.Database): Promise<void> {
    try {
      const result = await this.client.exists(path.dirname(this.options.cloudPath))
      if (!result) {
        throw new Error('WebDav目录不存在')
      }
      const str = await this.client.getFileContents(this.options.cloudPath, {
        format: 'text'
      })
      await dbInstance.loadIt(str)
    } catch (e) {
      throw new Error('WebDav目录导入出错:' + e)
    }
  }
}
