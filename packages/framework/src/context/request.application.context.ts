import { GenericApplicationContext } from './generic.application.context';
import { IApplicationContext } from '../interface';
import { REQUEST_CTX_KEY } from '../constant';
import { PIPELINE_IDENTIFIER } from '../decorators/decorator.manager';

export class RequestApplicationContext extends GenericApplicationContext {
  private readonly applicationContext: IApplicationContext;

  constructor(ctx, applicationContext: IApplicationContext) {
    super(applicationContext);
    this.applicationContext = applicationContext;

    // update legacy relationship
    this.registry.setIdentifierRelation(
      this.applicationContext.registry.getIdentifierRelation()
    );

    this.ctx = ctx;
    // register ctx
    this.registerObject(REQUEST_CTX_KEY, ctx);
    // register res
    this.registerObject('res', {});

    if (ctx.logger) {
      // register contextLogger
      this.registerObject('logger', ctx.logger);
    }
  }

  init() {
    // do nothing
  }

  get<T = any>(identifier: any, args?: any): T {
    if (typeof identifier !== 'string') {
      identifier = this.getIdentifier(identifier);
    }

    if (this.registry.hasObject(identifier)) {
      return this.registry.getObject(identifier);
    }

    const definition =
      this.applicationContext.registry.getDefinition(identifier);
    if (definition) {
      if (
        definition.isRequestScope() ||
        definition.id === PIPELINE_IDENTIFIER
      ) {
        // create object from applicationContext definition for requestScope
        return this.getManagedResolverFactory().create({
          definition,
          args,
        });
      }
    }

    if (this.parent) {
      return this.parent.get(identifier, args);
    }
  }

  async getAsync<T = any>(identifier: any, args?: any): Promise<T> {
    if (typeof identifier !== 'string') {
      identifier = this.getIdentifier(identifier);
    }

    if (this.registry.hasObject(identifier)) {
      return this.registry.getObject(identifier);
    }

    const definition =
      this.applicationContext.registry.getDefinition(identifier);
    if (definition) {
      if (
        definition.isRequestScope() ||
        definition.id === PIPELINE_IDENTIFIER
      ) {
        // create object from applicationContext definition for requestScope
        return this.getManagedResolverFactory().createAsync({
          definition,
          args,
        });
      }
    }

    if (this.parent) {
      return this.parent.getAsync<T>(identifier, args);
    }
  }

  async ready() {
    // ignore other things
  }

  getContext() {
    return this.ctx;
  }
}
