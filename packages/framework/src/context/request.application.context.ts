import { GenericApplicationContext } from './generic.application.context'
import type { IApplicationContext } from '../interface'
import { REQUEST_CTX_KEY } from '../constant'
import { PIPELINE_IDENTIFIER } from '../decorators/decorator.manager'

export class RequestApplicationContext extends GenericApplicationContext {
  private readonly applicationContext: IApplicationContext

  constructor(ctx: any, applicationContext: IApplicationContext) {
    super(applicationContext)
    this.applicationContext = applicationContext

    // update legacy relationship
    this.registry.setIdentifierRelation(this.applicationContext.registry.getIdentifierRelation())

    this.ctx = ctx
    // register ctx
    this.registerObject(REQUEST_CTX_KEY, ctx)
    // register res
    this.registerObject('res', {})

    if (ctx.logger) {
      // register contextLogger
      this.registerObject('logger', ctx.logger)
    }
  }

  init(): void {
    // do nothing
  }

  override get<T = any>(identifier: any, args?: any): T {
    const obj = this.getObject(identifier)
    if (obj) return obj

    const definition = this.applicationContext.registry.getDefinition(identifier)
    if (definition) {
      if (definition.isRequestScope() || definition.id === PIPELINE_IDENTIFIER) {
        // create object from applicationContext definition for requestScope
        return this.getManagedResolverFactory().create({
          definition,
          args
        })
      }
    }

    if (this.parent) {
      return this.parent.get(identifier, args)
    }
    return undefined as unknown as T
  }
  private getObject<T = any>(identifier: any): T {
    if (typeof identifier !== 'string') {
      identifier = this.getIdentifier(identifier)
    }

    if (this.registry.hasObject(identifier)) {
      return this.registry.getObject(identifier)
    }

    // 如果父级有，则直接返回
    if (this.parent.hasObject(identifier)) {
      return this.parent.registry.getObject(identifier)
    }
    return undefined as unknown as T
  }
  async getAsync<T = any>(identifier: any, args?: any): Promise<T> {
    const obj = this.getObject(identifier)
    if (obj) return obj

    const definition = this.applicationContext.registry.getDefinition(identifier)
    if (definition) {
      if (definition.isRequestScope() || definition.id === PIPELINE_IDENTIFIER) {
        // create object from applicationContext definition for requestScope
        return this.getManagedResolverFactory().createAsync({
          definition,
          args
        })
      }
    }

    if (this.parent) {
      return this.parent.getAsync<T>(identifier, args)
    }
    return undefined as unknown as T
  }

  async ready(): Promise<void> {
    // ignore other things
  }

  getContext(): any {
    return this.ctx
  }
}
