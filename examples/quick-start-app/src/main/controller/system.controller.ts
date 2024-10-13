import { Autowired, type Context, Controller, Event } from '@electron-boot/framework'
import { PouchDBServices } from '@electron-boot/pouchdb'

@Controller()
export class System {
  @Autowired()
  ctx!: Context
  @Autowired()
  pouchdbService!: PouchDBServices

  @Event()
  logger(...args: any[]) {
    console.log('进来了2', this.ctx.getAttr('event'), args)
    return '我是返回信息'
  }
}
