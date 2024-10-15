import { Provide, Init, Autowired } from '@electron-boot/framework'
import { PouchDBServices } from '@electron-boot/pouchdb'

@Provide()
export class DbService {
  @Autowired()
  pouchdbService!: PouchDBServices
  @Init()
  Init() {
    console.log('进来了', this.pouchdbService)
  }
}
