import { getClassMetadata, IPC_KEY, saveClassMetadata } from './decorator.manager'
import type { IpcMetadata } from '../interface'

export const Ipc = (customName: string = ''): MethodDecorator => {
  return (target, propertyKey: string | symbol, _descriptor) => {
    let metadata = getClassMetadata<Array<IpcMetadata>>(IPC_KEY, target)
    if (!metadata) {
      metadata = []
    }
    metadata.push({
      propertyKey: propertyKey as string,
      customName: customName
    })
    saveClassMetadata(IPC_KEY, metadata, target)
  }
}
