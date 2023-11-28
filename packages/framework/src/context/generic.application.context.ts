import {
  IApplicationContext,
  IFileDetector,
  IIdentifierRelationShip,
  IModuleStore,
  IObjectDefinition,
  IObjectDefinitionRegistry,
  ObjectBeforeBindOptions,
  ObjectBeforeCreatedOptions,
  ObjectBeforeDestroyOptions,
  ObjectContext,
  ObjectCreatedOptions,
  ObjectIdentifier,
  ObjectInitOptions,
  ObjectLifeCycleEvent,
  ScopeEnum,
} from '../interface';
import { EventEmitter } from 'events';
import {
  CONTAINER_OBJ_SCOPE,
  FUNCTION_INJECT_KEY,
  REQUEST_CTX_KEY,
  SINGLETON_CONTAINER_CTX,
} from '../constant';
import { ObjectDefinitionRegistry } from './definition.registry';
import * as Types from '../utils/types.util';
import {
  CONFIGURATION_KEY,
  getClassExtendedMetadata,
  getClassMetadata,
  getObjectDefinition,
  getPropertyInject,
  getProviderName,
  getProviderUUId,
  INJECT_CUSTOM_PROPERTY,
  listModule,
  MAIN_MODULE_KEY,
  saveModule,
  saveProviderId,
} from '../decorators/decorator.manager';
import * as Strings from '../utils/string.util';
import { ObjectDefinition } from '../definitions/object.definition';
import { FunctionDefinition } from '../definitions/function.definition';
import {
  ManagedReference,
  ManagedResolverFactory,
} from './managed.resolver.factory';
import { DefinitionNotFoundError } from '../error/framework';
import {
  IComponentInfo,
  InjectionConfigurationOptions,
} from '../decorators/configuration.decorator';
import { ConfigService } from '../service/config.service';
import { EnvironmentService } from '../service/environment.service';
import { FunctionalConfiguration } from '../functional/configuration';

class ContainerConfiguration {
  private loadedMap = new WeakMap();
  private namespaceList = [];
  private configurationOptionsList: Array<InjectionConfigurationOptions> = [];
  constructor(readonly container: IApplicationContext) {}

  load(module) {
    let namespace = MAIN_MODULE_KEY;
    // 可能导出多个
    const configurationExports = this.getConfigurationExport(module);
    if (!configurationExports.length) return;
    // 多个的情况，数据交给第一个保存
    for (let i = 0; i < configurationExports.length; i++) {
      const configurationExport = configurationExports[i];

      if (this.loadedMap.get(configurationExport)) {
        // 已经加载过就跳过循环
        continue;
      }

      let configurationOptions: InjectionConfigurationOptions;
      if (configurationExport instanceof FunctionalConfiguration) {
        // 函数式写法
        configurationOptions = configurationExport.getConfigurationOptions();
      } else {
        // 普通类写法
        configurationOptions = getClassMetadata(
          CONFIGURATION_KEY,
          configurationExport
        );
      }

      // 已加载标记，防止死循环
      this.loadedMap.set(configurationExport, true);

      if (configurationOptions) {
        if (configurationOptions.namespace !== undefined) {
          namespace = configurationOptions.namespace;
          this.namespaceList.push(namespace);
        }
        this.configurationOptionsList.push(configurationOptions);
        this.addImports(configurationOptions.imports);
        this.addImportObjects(configurationOptions.importObjects);
        this.addImportConfigs(configurationOptions.importConfigs);
        this.addImportConfigFilter(configurationOptions.importConfigFilter);
        this.bindConfigurationClass(configurationExport, namespace);
      }
    }

    // bind module
    this.container.bindClass(module, {
      namespace,
    });
  }

  addImportConfigs(
    importConfigs:
      | Array<{ [environmentName: string]: Record<string, any> }>
      | Record<string, any>
  ) {
    if (importConfigs) {
      if (Array.isArray(importConfigs)) {
        this.container.get(ConfigService).add(importConfigs);
      } else {
        this.container.get(ConfigService).addObject(importConfigs);
      }
    }
  }

  addImportConfigFilter(
    importConfigFilter: (config: Record<string, any>) => Record<string, any>
  ) {
    if (importConfigFilter) {
      this.container.get(ConfigService).addFilter(importConfigFilter);
    }
  }

  addImports(imports: any[] = []) {
    // 处理 imports
    for (let importPackage of imports) {
      if (!importPackage) continue;
      if (typeof importPackage === 'string') {
        importPackage = require(importPackage);
      }
      if ('Configuration' in importPackage) {
        // component is object
        this.load(importPackage);
      } else if ('component' in importPackage) {
        if ((importPackage as IComponentInfo)?.enabledEnvironment) {
          if (
            (importPackage as IComponentInfo)?.enabledEnvironment?.includes(
              this.container.get(EnvironmentService).getCurrentEnvironment()
            )
          ) {
            this.load((importPackage as IComponentInfo).component);
          }
        } else {
          this.load((importPackage as IComponentInfo).component);
        }
      } else {
        this.load(importPackage);
      }
    }
  }

  /**
   * 注册 importObjects
   * @param objs configuration 中的 importObjects
   */
  addImportObjects(objs: any) {
    if (objs) {
      const keys = Object.keys(objs);
      for (const key of keys) {
        if (typeof objs[key] !== undefined) {
          this.container.registerObject(key, objs[key]);
        }
      }
    }
  }

  bindConfigurationClass(clzz, namespace) {
    if (clzz instanceof FunctionalConfiguration) {
      // 函数式写法不需要绑定到容器
    } else {
      // 普通类写法
      saveProviderId(undefined, clzz);
      const id = getProviderUUId(clzz);
      this.container.bind(id, clzz, {
        namespace: namespace,
        scope: ScopeEnum.Singleton,
      });
    }

    // configuration 手动绑定去重
    const configurationMods = listModule(CONFIGURATION_KEY);
    const exists = configurationMods.find(mod => {
      return mod.target === clzz;
    });
    if (!exists) {
      saveModule(CONFIGURATION_KEY, {
        target: clzz,
        namespace: namespace,
      });
    }
  }

  private getConfigurationExport(exports): any[] {
    const mods = [];
    if (
      Types.isClass(exports) ||
      Types.isFunction(exports) ||
      exports instanceof FunctionalConfiguration
    ) {
      mods.push(exports);
    } else {
      for (const m in exports) {
        const module = exports[m];
        if (
          Types.isClass(module) ||
          Types.isFunction(module) ||
          module instanceof FunctionalConfiguration
        ) {
          mods.push(module);
        }
      }
    }
    return mods;
  }

  public getNamespaceList() {
    return this.namespaceList;
  }

  public getConfigurationOptionsList() {
    return this.configurationOptionsList;
  }
}

export class GenericApplicationContext
  implements IApplicationContext, IModuleStore
{
  private _resolverFactory: ManagedResolverFactory = null;
  private _identifierMapping = null;
  private moduleMap = null;
  private _objectCreateEventTarget: EventEmitter;
  public parent: IApplicationContext;
  private _registry: IObjectDefinitionRegistry;
  protected ctx = SINGLETON_CONTAINER_CTX;
  private attrMap: Map<string, any> = new Map();
  private _namespaceSet: Set<string> = null;
  private fileDetector: IFileDetector | false | undefined;

  constructor(parent?: IApplicationContext) {
    this.parent = parent;
    this.init();
  }

  protected init() {
    // 防止直接从applicationContext.getAsync or get对象实例时依赖当前上下文信息出错
    // ctx is in requestContainer
    this.registerObject(REQUEST_CTX_KEY, this.ctx);
  }

  get identifierMapping(): IIdentifierRelationShip {
    if (!this._identifierMapping) {
      this._identifierMapping = this.registry.getIdentifierRelation();
    }
    return this._identifierMapping;
  }

  get objectCreateEventTarget() {
    if (!this._objectCreateEventTarget) {
      this._objectCreateEventTarget = new EventEmitter();
    }
    return this._objectCreateEventTarget;
  }

  get registry(): IObjectDefinitionRegistry {
    if (!this._registry) {
      this._registry = new ObjectDefinitionRegistry();
    }
    return this._registry;
  }

  get namespaceSet(): Set<string> {
    if (!this._namespaceSet) {
      this._namespaceSet = new Set();
    }
    return this._namespaceSet;
  }

  onBeforeBind(
    fn: (args: any, options: ObjectBeforeBindOptions) => void
  ): void {}

  onBeforeObjectCreated(
    fn: (args: any, options: ObjectBeforeCreatedOptions) => void
  ): void {}

  onBeforeObjectDestroy<T>(
    fn: <T>(ins: T, options: ObjectBeforeDestroyOptions) => void
  ): void {}

  onObjectCreated<T>(
    fn: <T>(ins: T, options: ObjectCreatedOptions<T>) => void
  ): void {}

  onObjectInit<T>(fn: <T>(ins: T, options: ObjectInitOptions) => void): void {}

  bind<T>(target: T, options?: Partial<IObjectDefinition>): void;
  bind<T>(
    identifier: ObjectIdentifier,
    target: T,
    options?: Partial<IObjectDefinition>
  ): void;
  bind(identifier: any, target: any, options?: any): void {
    if (Types.isClass(identifier) || Types.isFunction(identifier)) {
      return this.bindModule(identifier, target);
    }
    if (this.registry.hasDefinition(identifier)) {
      // 如果 definition 存在就不再重复 bind
      return;
    }
    if (options?.bindHook) {
      options.bindHook(target, options);
    }

    let definition;
    if (Types.isClass(target)) {
      definition = new ObjectDefinition();
      definition.name = getProviderName(target);
    } else {
      definition = new FunctionDefinition();
      if (!Types.isAsyncFunction(target)) {
        definition.asynchronous = false;
      }
      definition.name = definition.id;
    }

    definition.path = target;
    definition.id = identifier;
    definition.srcPath = options?.srcPath || null;
    definition.namespace = options?.namespace || '';
    definition.scope = options?.scope || ScopeEnum.Request;
    definition.createFrom = options?.createFrom;

    // inject properties
    const props = getPropertyInject(target);

    for (const p in props) {
      const propertyMeta = props[p];
      const refManaged = new ManagedReference();
      refManaged.args = propertyMeta.args;
      refManaged.name = propertyMeta.value as any;
      refManaged.injectMode = propertyMeta['injectMode'];
      definition.properties.set(propertyMeta['targetKey'], refManaged);
    }

    // inject custom properties
    const customProps = getClassExtendedMetadata(
      INJECT_CUSTOM_PROPERTY,
      target
    );

    for (const p in customProps) {
      const propertyMeta = customProps[p] as {
        propertyName: string;
        key: string;
        metadata: any;
      };
      definition.handlerProps.push(propertyMeta);
    }

    // @async, @init, @destroy @scope
    const objDefOptions = getObjectDefinition(target) ?? {};

    if (objDefOptions.initMethod) {
      definition.initMethod = objDefOptions.initMethod;
    }

    if (objDefOptions.destroyMethod) {
      definition.destroyMethod = objDefOptions.destroyMethod;
    }

    if (objDefOptions.scope) {
      definition.scope = objDefOptions.scope;
    }

    if (objDefOptions.allowDowngrade) {
      definition.allowDowngrade = objDefOptions.allowDowngrade;
    }

    this.objectCreateEventTarget.emit(
      ObjectLifeCycleEvent.BEFORE_BIND,
      target,
      {
        context: this,
        definition,
        replaceCallback: newDefinition => {
          definition = newDefinition;
        },
      }
    );

    if (definition) {
      this.registry.registerDefinition(definition.id, definition);
    }
  }

  protected bindModule(module: any, options: Partial<IObjectDefinition>) {
    if (Types.isClass(module)) {
      const providerId = getProviderUUId(module);
      if (providerId) {
        this.identifierMapping.saveClassRelation(module, options?.namespace);
        this.bind(providerId, module, options);
      } else {
        // no provide or js class must be skip
      }
    } else {
      const info: {
        id: ObjectIdentifier;
        provider: (context?: IApplicationContext) => any;
        scope?: ScopeEnum;
      } = module[FUNCTION_INJECT_KEY];
      if (info && info.id) {
        if (!info.scope) {
          info.scope = ScopeEnum.Request;
        }
        const uuid = Strings.generateRandomId();
        this.identifierMapping.saveFunctionRelation(info.id, uuid);
        this.bind(uuid, module, {
          scope: info.scope,
          namespace: options.namespace,
          srcPath: options.srcPath,
          createFrom: options.createFrom,
        });
      }
    }
  }

  protected loadDefinitions(): void | Promise<void> {
    // load project file
    if (this.fileDetector) {
      return this.fileDetector.run(this);
    }
  }

  bindClass(exports: any, options?: Partial<IObjectDefinition>): void {
    if (Types.isClass(exports) || Types.isFunction(exports)) {
      this.bindModule(exports, options);
    } else {
      for (const m in exports) {
        const module = exports[m];
        if (Types.isClass(module) || Types.isFunction(module)) {
          this.bindModule(module, options);
        }
      }
    }
  }

  createChild(): IApplicationContext {
    return undefined;
  }

  get<T>(
    identifier: { new (...args: any[]): T },
    args?: any[],
    objectContext?: ObjectContext
  ): T;
  get<T>(
    identifier: ObjectIdentifier,
    args?: any[],
    objectContext?: ObjectContext
  ): T;
  get<T>(identifier, args?: any[], objectContext?: ObjectContext): T {
    args = args ?? [];
    objectContext = objectContext ?? { originName: identifier };
    if (typeof identifier !== 'string') {
      objectContext.originName = identifier.name;
      identifier = this.getIdentifier(identifier);
    }
    if (this.registry.hasObject(identifier)) {
      return this.registry.getObject(identifier);
    }
    const definition = this.registry.getDefinition(identifier);
    if (!definition && this.parent) {
      return this.parent.get(identifier, args);
    }
    if (!definition) {
      throw new DefinitionNotFoundError(
        objectContext?.originName ?? identifier
      );
    }
    return this.getManagedResolverFactory().create({ definition, args });
  }

  getAsync<T>(
    identifier: { new (...args: any[]): T },
    args?: any[],
    objectContext?: ObjectContext
  ): Promise<T>;
  getAsync<T>(
    identifier: ObjectIdentifier,
    args?: any[],
    objectContext?: ObjectContext
  ): Promise<T>;
  getAsync(
    identifier: any,
    args?: any[],
    objectContext?: ObjectContext
  ): Promise<any> {
    args = args ?? [];
    objectContext = objectContext ?? { originName: identifier };
    if (typeof identifier !== 'string') {
      objectContext.originName = identifier.name;
      identifier = this.getIdentifier(identifier);
    }
    if (this.registry.hasObject(identifier)) {
      return this.registry.getObject(identifier);
    }

    const definition = this.registry.getDefinition(identifier);
    if (!definition && this.parent) {
      return this.parent.getAsync(identifier, args);
    }

    if (!definition) {
      throw new DefinitionNotFoundError(
        objectContext?.originName ?? identifier
      );
    }

    return this.getManagedResolverFactory().createAsync({ definition, args });
  }

  getAttr<T>(key: string): T {
    return this.attrMap.get(key);
  }

  protected getIdentifier(target: any) {
    return getProviderUUId(target);
  }

  protected getManagedResolverFactory() {
    if (!this._resolverFactory) {
      this._resolverFactory = new ManagedResolverFactory(this);
    }
    return this._resolverFactory;
  }

  getInstanceScope(instance: any): ScopeEnum | undefined {
    if (instance[CONTAINER_OBJ_SCOPE]) {
      return instance[CONTAINER_OBJ_SCOPE];
    }
    return undefined;
  }

  getNamespaceList(): string[] {
    return Array.from(this.namespaceSet);
  }

  hasDefinition(identifier: ObjectIdentifier): boolean {
    return this.registry.hasDefinition(identifier);
  }

  transformModule(moduleMap: Map<string, Set<any>>) {
    this.moduleMap = new Map(moduleMap);
  }

  hasNamespace(namespace: string): boolean {
    return this.namespaceSet.has(namespace);
  }

  hasObject(identifier: ObjectIdentifier): boolean {
    return this.registry.hasObject(identifier);
  }

  listModule(key: ObjectIdentifier): any[] {
    return Array.from(this.moduleMap.get(key) || {});
  }

  load(module: any): void {
    if (!Array.isArray(module)) {
      module = [module];
    }
    // load configuration
    const configuration = new ContainerConfiguration(this);

    for (const mod of module) {
      if (mod) {
        configuration.load(mod);
      }
    }
    for (const ns of configuration.getNamespaceList()) {
      this.namespaceSet.add(ns);
    }

    const configurationOptionsList =
      configuration.getConfigurationOptionsList() ?? [];

    // find user code configuration it's without namespace
    const userCodeConfiguration =
      configurationOptionsList.find(options => !options.namespace) ?? {};

    this.fileDetector = userCodeConfiguration.detector ?? this.fileDetector;

    if (this.fileDetector) {
      this.fileDetector.setExtraDetectorOptions({
        conflictCheck: userCodeConfiguration.conflictCheck,
        ...userCodeConfiguration.detectorOptions,
      });
    }
  }

  ready(): void | Promise<void> {
    return this.loadDefinitions();
  }

  registerObject(identifier: ObjectIdentifier, target: any): void {
    this.registry.registerObject(identifier, target);
  }

  saveModule(key: ObjectIdentifier, module: any): void {
    if (!this.moduleMap.has(key)) {
      this.moduleMap.set(key, new Set());
    }
    this.moduleMap.get(key).add(module);
  }

  setAttr(key: string, value: any): void {
    this.attrMap.set(key, value);
  }

  stop(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
