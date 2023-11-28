import { Autowired, type Context, Controller, Event } from '@electron-boot/framework'

@Controller()
export class System {
  @Autowired()
  ctx!: Context
  @Event()
  logger(...args: any[]) {
    console.log('进来了2', this.ctx.getAttr('event'), args)
    return '我是返回信息'
  }
}
