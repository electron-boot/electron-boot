import { Autowired, type Context, Controller, Event } from '@electron-boot/framework'
import { PouchDBServices } from '@electron-boot/pouchdb'
import { DbService } from '../service/db.service'

@Controller()
export class System {
  @Autowired()
  ctx!: Context
  @Autowired()
  pouchdbService!: PouchDBServices
  @Autowired()
  dbService!: DbService

  @Event()
  logger(...args: any[]) {
    console.log('进来了2', this.ctx.getAttr('event'), args, this.dbService)
    return '我是返回信息'
  }
}
