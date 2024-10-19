import { Autowired, type Context, Controller, Event } from '../../../../src';

@Controller('system')
export class SystemController {
  @Autowired()
  ctx!: Context;

  @Event()
  ping() {
    return 'pong';
  }
}
