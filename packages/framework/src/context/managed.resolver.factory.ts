import type * as EventEmitter from 'node:events';
import type {
  IApplicationContext,
  IManagedInstance,
  IManagedResolver,
  IManagedResolverFactoryCreateOptions,
  IObjectDefinition,
  ObjectIdentifier,
} from '../interface';
import { InjectMode, ObjectLifeCycleEvent, ScopeEnum } from '../interface';
import { CONTAINER_OBJ_SCOPE, KEYS, REQUEST_CTX_KEY, REQUEST_OBJ_CTX_KEY, SINGLETON_CONTAINER_CTX } from '../constant';
import {
  CommonError,
  MissingImportComponentError,
  ResolverMissingError,
  SingletonInjectRequestError,
} from '../error/framework';

export class ManagedReference implements IManagedInstance {
  type = KEYS.REF_ELEMENT;
  name: string | undefined;
  injectMode: InjectMode | undefined;
  args?: any;
}

/**
 * 解析ref
 */
class RefResolver {
  constructor(readonly factory: ManagedResolverFactory) {}
  get type(): string {
    return KEYS.REF_ELEMENT;
  }

  resolve(managed: IManagedInstance, originName: string): any {
    const mr = managed as ManagedReference;
    if (
      mr.injectMode === InjectMode.Class &&
      !(this.factory.context.parent ?? this.factory.context).hasDefinition(mr.name)
    ) {
      throw new MissingImportComponentError(originName);
    }
    return this.factory.context.get(mr.name, mr.args, {
      originName,
    });
  }

  async resolveAsync(managed: IManagedInstance, originName: string): Promise<any> {
    const mr = managed as ManagedReference;
    if (
      mr.injectMode === InjectMode.Class &&
      !(this.factory.context.parent ?? this.factory.context).hasDefinition(mr.name)
    ) {
      throw new MissingImportComponentError(originName);
    }
    return this.factory.context.getAsync(mr.name, mr.args, {
      originName,
    });
  }
}

/**
 * 解析工厂
 */
export class ManagedResolverFactory {
  private resolvers = {};
  private creating = new Map<string, boolean>();
  singletonCache = new Map<ObjectIdentifier, any>();
  context: IApplicationContext;

  constructor(context: IApplicationContext) {
    this.context = context;

    // 初始化解析器
    this.resolvers = {
      ref: new RefResolver(this),
    };
  }

  registerResolver(resolver: IManagedResolver): void {
    this.resolvers[resolver.type] = resolver;
  }

  resolveManaged(managed: IManagedInstance, originPropertyName: string): any {
    const resolver = this.resolvers[managed.type];
    if (!resolver || resolver.type !== managed.type) {
      throw new ResolverMissingError(managed.type);
    }
    return resolver.resolve(managed, originPropertyName);
  }

  async resolveManagedAsync(managed: IManagedInstance, originPropertyName: string): Promise<any> {
    const resolver = this.resolvers[managed.type];
    if (!resolver || resolver.type !== managed.type) {
      throw new ResolverMissingError(managed.type);
    }
    return resolver.resolveAsync(managed, originPropertyName);
  }

  /**
   * 同步创建对象
   * @param opt
   */
  create(opt: IManagedResolverFactoryCreateOptions): any {
    const { definition, args } = opt;
    if (definition.isSingletonScope() && this.singletonCache.has(definition.id)) {
      return this.singletonCache.get(definition.id);
    }
    // 如果非 null 表示已经创建 proxy
    let inst = this.createProxyReference(definition);
    if (inst) {
      return inst;
    }

    this.compareAndSetCreateStatus(definition);
    // 预先初始化依赖
    if (definition.hasDependsOn()) {
      for (const dep of definition.dependsOn) {
        this.context.get(dep, args);
      }
    }

    const Clzz = definition.creator.load();

    let constructorArgs: any[] = [];
    if (args && Array.isArray(args) && args.length > 0) {
      constructorArgs = args;
    }
    this.getObjectEventTarget().emit(ObjectLifeCycleEvent.BEFORE_CREATED, Clzz, {
      constructorArgs,
      definition,
      context: this.context,
    });

    inst = definition.creator.doConstruct(Clzz, constructorArgs, this.context);

    // binding ctx object
    if (definition.isRequestScope() && definition.constructor.name === 'ObjectDefinition') {
      Object.defineProperty(inst, REQUEST_OBJ_CTX_KEY, {
        value: this.context.get(REQUEST_CTX_KEY),
        writable: false,
        enumerable: false,
      });
    }

    if (definition.properties) {
      const keys = definition.properties.propertyKeys() as string[];
      for (const key of keys) {
        this.checkSingletonInvokeRequest(definition, key);
        try {
          inst[key] = this.resolveManaged(definition.properties.get(key), key);
        } catch (error) {
          // if (MidwayDefinitionNotFoundError.isClosePrototypeOf(error)) {
          //   const className = definition.path.name;
          //   error.updateErrorMsg(className);
          // }
          this.removeCreateStatus(definition, true);
          throw error;
        }
      }
    }

    this.getObjectEventTarget().emit(ObjectLifeCycleEvent.AFTER_CREATED, inst, {
      context: this.context,
      definition,
      replaceCallback: (ins) => {
        inst = ins;
      },
    });

    // after properties set then do init
    definition.creator.doInit(inst);

    this.getObjectEventTarget().emit(ObjectLifeCycleEvent.AFTER_INIT, inst, {
      context: this.context,
      definition,
    });
    if (definition.id) {
      if (definition.isSingletonScope()) {
        this.singletonCache.set(definition.id, inst);
        this.setInstanceScope(inst, ScopeEnum.Singleton);
      } else if (definition.isRequestScope()) {
        this.context.registerObject(definition.id, inst);
        this.setInstanceScope(inst, ScopeEnum.Request);
      } else {
        this.setInstanceScope(inst, ScopeEnum.Prototype);
      }
    }

    this.removeCreateStatus(definition, true);

    return inst;
  }

  /**
   * 异步创建对象
   * @param opt
   */
  async createAsync(opt: IManagedResolverFactoryCreateOptions): Promise<any> {
    const { definition, args } = opt;
    if (definition.isSingletonScope() && this.singletonCache.has(definition.id)) {
      return this.singletonCache.get(definition.id);
    }

    // 如果非 null 表示已经创建 proxy
    let inst = this.createProxyReference(definition);
    if (inst) {
      return inst;
    }

    this.compareAndSetCreateStatus(definition);
    // 预先初始化依赖
    if (definition.hasDependsOn()) {
      for (const dep of definition.dependsOn) {
        await this.context.getAsync(dep, args);
      }
    }

    const Clzz = definition.creator.load();
    let constructorArgs: any[] = [];
    if (args && Array.isArray(args) && args.length > 0) {
      constructorArgs = args;
    }

    this.getObjectEventTarget().emit(ObjectLifeCycleEvent.BEFORE_CREATED, Clzz, {
      constructorArgs,
      context: this.context,
    });

    inst = await definition.creator.doConstructAsync(Clzz, constructorArgs, this.context);
    if (!inst) {
      this.removeCreateStatus(definition, false);
      throw new CommonError(`${definition.id} construct return undefined`);
    }

    // binding ctx object
    if (definition.isRequestScope() && definition.constructor.name === 'ObjectDefinition') {
      // set related ctx
      Object.defineProperty(inst, REQUEST_OBJ_CTX_KEY, {
        value: this.context.get(REQUEST_CTX_KEY),
        writable: false,
        enumerable: false,
      });
    }

    if (definition.properties) {
      const keys = definition.properties.propertyKeys() as string[];
      for (const key of keys) {
        this.checkSingletonInvokeRequest(definition, key);
        try {
          inst[key] = await this.resolveManagedAsync(definition.properties.get(key), key);
        } catch (error) {
          // if (MidwayDefinitionNotFoundError.isClosePrototypeOf(error)) {
          //   const className = definition.path.name;
          //   error.updateErrorMsg(className);
          // }
          this.removeCreateStatus(definition, false);
          throw error;
        }
      }
    }

    this.getObjectEventTarget().emit(ObjectLifeCycleEvent.AFTER_CREATED, inst, {
      context: this.context,
      definition,
      replaceCallback: (ins) => {
        inst = ins;
      },
    });

    // after properties set then do init
    await definition.creator.doInitAsync(inst);

    this.getObjectEventTarget().emit(ObjectLifeCycleEvent.AFTER_INIT, inst, {
      context: this.context,
      definition,
    });

    if (definition.id) {
      if (definition.isSingletonScope()) {
        this.singletonCache.set(definition.id, inst);
        this.setInstanceScope(inst, ScopeEnum.Singleton);
      } else if (definition.isRequestScope()) {
        this.context.registerObject(definition.id, inst);
        this.setInstanceScope(inst, ScopeEnum.Request);
      } else {
        this.setInstanceScope(inst, ScopeEnum.Prototype);
      }
    }

    this.removeCreateStatus(definition, true);

    return inst;
  }

  async destroyCache(): Promise<void> {
    for (const key of this.singletonCache.keys()) {
      const definition = this.context.registry.getDefinition(key);
      if (definition.creator) {
        const inst = this.singletonCache.get(key);
        this.getObjectEventTarget().emit(ObjectLifeCycleEvent.BEFORE_DESTROY, inst, {
          context: this.context,
          definition,
        });
        await definition.creator.doDestroyAsync(inst);
      }
    }
    this.singletonCache.clear();
    this.creating.clear();
  }

  /**
   * 触发单例初始化结束事件
   * @param definition 单例定义
   * @param success 成功 or 失败
   */
  private removeCreateStatus(definition: IObjectDefinition, _success: boolean): boolean {
    // 如果map中存在表示需要设置状态
    if (this.creating.has(definition.id)) {
      this.creating.set(definition.id, false);
    }
    return true;
  }

  public isCreating(definition: IObjectDefinition): boolean | undefined {
    return this.creating.has(definition.id) && this.creating.get(definition.id);
  }

  private compareAndSetCreateStatus(definition: IObjectDefinition) {
    if (!this.creating.has(definition.id) || !this.creating.get(definition.id)) {
      this.creating.set(definition.id, true);
    }
  }
  /**
   * 创建对象定义的代理访问逻辑
   * @param definition 对象定义
   */
  private createProxyReference(definition: IObjectDefinition): any {
    if (this.isCreating(definition)) {
      // 非循环依赖的允许重新创建对象
      if (!this.depthFirstSearch(definition.id, definition)) {
        return null;
      }
      // 创建代理对象
      return new Proxy(
        { __is_proxy__: true, __target_id__: definition.id },
        {
          get: (_obj: any, prop: string | symbol) => {
            let target;
            if (definition.isRequestScope()) {
              target = this.context.registry.getObject(definition.id);
            } else if (definition.isSingletonScope()) {
              target = this.singletonCache.get(definition.id);
            } else {
              target = this.context.get(definition.id);
            }

            if (target) {
              if (typeof target[prop] === 'function') {
                return target[prop].bind(target);
              }
              return target[prop];
            }

            return undefined;
          },
        },
      );
    }
    return null;
  }
  /**
   * 遍历依赖树判断是否循环依赖
   * @param identifier 目标id
   * @param definition 定义描述
   * @param depth
   */
  public depthFirstSearch(identifier: string, definition: IObjectDefinition, depth?: string[]): boolean {
    if (definition) {
      if (definition.properties) {
        const keys = definition.properties.propertyKeys() as string[];
        if (keys.indexOf(identifier) > -1) {
          return true;
        }
        for (const key of keys) {
          if (!Array.isArray(depth)) {
            depth = [identifier];
          }
          let iden = key;
          const ref: ManagedReference = definition.properties.get(key);
          if (ref && ref.name) {
            iden = this.context.identifierMapping.getRelation(ref.name) ?? ref.name;
          }
          if (iden === identifier) {
            return true;
          }
          if (depth.indexOf(iden) > -1) {
            continue;
          } else {
            depth.push(iden);
          }
          let subDefinition = this.context.registry.getDefinition(iden);
          if (!subDefinition && this.context.parent) {
            subDefinition = this.context.parent.registry.getDefinition(iden);
          }
          if (this.depthFirstSearch(identifier, subDefinition, depth)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private getObjectEventTarget(): EventEmitter {
    if (this.context.parent) {
      return this.context.parent.objectCreateEventTarget!;
    }
    return this.context.objectCreateEventTarget!;
  }

  private checkSingletonInvokeRequest(definition, key) {
    if (definition.isSingletonScope()) {
      const managedRef = definition.properties.get(key);
      if (this.context.hasDefinition(managedRef?.name)) {
        const propertyDefinition = this.context.registry.getDefinition(managedRef.name);
        if (propertyDefinition.isRequestScope() && !propertyDefinition.allowDowngrade) {
          throw new SingletonInjectRequestError(definition.path.name, propertyDefinition.path.name);
        }
      }
    }
    return true;
  }

  private setInstanceScope(inst, scope: ScopeEnum) {
    if (typeof inst === 'object') {
      if (scope === ScopeEnum.Request && inst[REQUEST_OBJ_CTX_KEY] === SINGLETON_CONTAINER_CTX) {
        scope = ScopeEnum.Singleton;
      }
      Object.defineProperty(inst, CONTAINER_OBJ_SCOPE, {
        value: scope,
        writable: false,
        enumerable: false,
        configurable: false,
      });
    }
  }
}
