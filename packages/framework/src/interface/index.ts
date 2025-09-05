import type { EventEmitter } from 'events'
import type { LoggerFactoryConfig } from '@electron-boot/logger'
import type { DecoratorManager } from '../decorators'

declare global {
  // eslint-disable-next-line no-var
  var ELECTRON_APPLICATION_DECORATOR_MANAGER: DecoratorManager
  // eslint-disable-next-line no-var
  var ELECTRON_APPLICATION_CONTEXT: IApplicationContext | null
}
/**
 * Identifier type
 * @type {ObjectIdentifier}
 */
export type ObjectIdentifier = string | symbol | undefined
/**
 * group mode type
 */
export type GroupModeType = 'one' | 'multi'

export interface MethodDecoratorOptions {
  impl?: boolean
}

/**
 * Utility type that adds a `fn` parameter to each method in the input type `T`,
 * transforming the original method's parameter types and return type into a function type.
 *
 * @example
 * // Input:
 * interface MyInterface {
 *   method1(a: string, b: number): boolean;
 *   method2(x: Foo, y: Bar): void;
 * }
 *
 * // Output:
 * interface MyInterfaceWithFn {
 *   method1(fn: (a: string, b: number) => boolean): void;
 *   method2(fn: (x: Foo, y: Bar) => void): void;
 * }
 */
export type WithFn<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => infer R ? (fn: (...args: P) => R) => void : T[K]
}

export interface TransformOptions<OriginType = unknown> {
  metaType: TSDesignType<OriginType>
  metadata: any
  /**
   * current instance
   */
  target: any
  /**
   * the name of method
   */
  methodName: string
}

export interface PipeTransform<T = unknown, R = unknown> {
  transform(value: T, transformOptions: TransformOptions): R
}

export type PipeTransformFunction<T = any, R = any> = (value: T) => R

export type PipeUnionTransform<T = any, R = any> =
  | PipeTransform<T, R>
  | (new (...args: any[]) => PipeTransform<T, R>)
  | PipeTransformFunction<T, R>

export interface MethodDecoratorMetaData<Metadata = any> {
  propertyName: string
  /** decorator key */
  key: string
  metadata: Metadata
  options: MethodDecoratorOptions | undefined
}
export interface MethodDecoratorOptions {
  impl?: boolean
}

export interface ParameterDecoratorMetaData<Metadata = any> {
  key: string
  parameterIndex: number
  propertyName: string
  metadata: Metadata
  options: ParamDecoratorOptions | undefined
}

export interface ParamDecoratorOptions {
  impl?: boolean
  throwError?: boolean
  pipes?: PipeUnionTransform<any, any>[]
}

/**
 * property and parameter decorator
 */
export type PropertyParamDecorator = (
  target: object,
  propertyKey: ObjectIdentifier | undefined,
  parameterIndex?: number
) => void
/**
 * class scope
 */
export enum ScopeEnum {
  Singleton = 'Singleton',
  Request = 'Request',
  Prototype = 'Prototype'
}

export enum InjectMode {
  Identifier = 'Identifier',
  Class = 'Class',
  PropertyName = 'PropertyName'
}

/**
 * 内部管理的属性、json、ref等解析实例存储
 */
export interface IManagedInstance {
  type: string
  value?: any
  args?: any
}

export interface ObjectDefinitionOptions {
  isAsync?: boolean
  initMethod?: string
  destroyMethod?: string
  scope?: ScopeEnum
  constructorArgs?: any[]
  namespace?: string
  srcPath?: string
  allowDowngrade?: boolean
}

export interface TagPropsMetadata {
  key: string | number | symbol
  value: any
  args?: any
}

export interface TagClsMetadata {
  id: string
  originName: string
  uuid: string
  name: string
}

export interface JoinPoint {
  methodName: string
  target: any
  args: any[]
  proceed?(...args: any[]): any
  proceedIsAsyncFunction?: boolean
}

export interface AspectMetadata {
  aspectTarget: any
  match?: string | (() => boolean)
  priority?: number
}

export interface IMethodAspect {
  after?(joinPoint: JoinPoint, result: any, error: Error): any
  afterReturn?(joinPoint: JoinPoint, result: any): any
  afterThrow?(joinPoint: JoinPoint, error: Error): void
  before?(joinPoint: JoinPoint): void
  around?(joinPoint: JoinPoint): any
}

export interface IModuleStore {
  listModule(key: ObjectIdentifier): any[]
  saveModule(key: ObjectIdentifier, module: any): void
  transformModule?(moduleMap: Map<ObjectIdentifier, Set<any>>): void
}

export interface TagClsMetadata {
  id: string
  originName: string
  uuid: string
  name: string
}

export interface TSDesignType<OriginType = unknown> {
  name: string
  originDesign: OriginType
  isBaseType: boolean
}

/**
 * Object Definition
 * 对象描述定义
 */
export interface IObjectDefinition {
  namespace?: string
  creator: IObjectCreator
  id: string
  name: string
  initMethod: string
  destroyMethod: string
  constructMethod: string
  srcPath: string
  path: any
  export: string
  dependsOn: ObjectIdentifier[]
  constructorArgs: IManagedInstance[]
  properties: IProperties
  scope: ScopeEnum
  isAsync(): boolean
  isSingletonScope(): boolean
  isRequestScope(): boolean
  hasDependsOn(): boolean
  hasConstructorArgs(): boolean
  getAttr(key: ObjectIdentifier): any
  hasAttr(key: ObjectIdentifier): boolean
  setAttr(key: ObjectIdentifier, value: any): void
  // 自定义装饰器的 key、propertyName
  handlerProps: Array<{
    /**
     * decorator property name set
     */
    propertyName: string
    /**
     * decorator uuid key
     */
    key: string
    /**
     * custom decorator set metadata
     */
    metadata: any
  }>
  createFrom: 'framework' | 'file' | 'module'
  allowDowngrade: boolean
  bindHook?: (module: any, options?: IObjectDefinition) => void
}

/**
 * 属性配置抽象
 */
export interface IProperties extends Map<ObjectIdentifier, any> {
  getProperty(key: ObjectIdentifier, defaultValue?: any): any
  setProperty(key: ObjectIdentifier, value: any): any
  propertyKeys(): ObjectIdentifier[]
}

/**
 * 解析内部管理的属性、json、ref等实例的解析器
 * 同时创建这些对象的实际使用的对象
 */
export interface IManagedResolver {
  type: string
  resolve(managed: IManagedInstance): any
  resolveAsync(managed: IManagedInstance): Promise<any>
}

export interface IManagedResolverFactoryCreateOptions {
  definition: IObjectDefinition
  args?: any
  namespace?: string
}

export type HandlerFunction = (
  /**
   * decorator uuid key
   */
  key: string,
  /**
   * decorator set metadata
   */
  meta: any,
  instance: any
) => any

export type MethodHandlerFunction = (options: {
  target: new (...args: any[]) => any
  propertyName: string
  metadata: any
}) => IMethodAspect

export type ParameterHandlerFunction = (options: {
  target: new (...args: any[]) => any
  propertyName: string
  metadata: any
  originArgs: Array<any>
  originParamType: any
  parameterIndex: number
}) => any

/**
 * Lifecycle Definition
 * 生命周期定义
 */
export interface ILifeCycle extends IObjectLifeCycle {
  onConfigLoad?(container: IApplicationContext): Promise<any>
  onReady?(container: IApplicationContext): Promise<void>
  onSocketReady?(container: IApplicationContext): Promise<void>
  onStop?(container: IApplicationContext): Promise<void>
}

export interface IObjectCreator {
  load(): any
  doConstruct(Clzz: any, args?: any, context?: IApplicationContext): any
  doConstructAsync(Clzz: any, args?: any, context?: IApplicationContext): Promise<any>
  doInit(obj: any): void
  doInitAsync(obj: any): Promise<void>
  doDestroy(obj: any): void
  doDestroyAsync(obj: any): Promise<void>
}

/**
 * Object Definition Registry
 * 对象定义存储容器
 */
export interface IObjectDefinitionRegistry {
  readonly identifiers: ObjectIdentifier[]
  readonly count: number
  registerDefinition(identifier: ObjectIdentifier, definition: IObjectDefinition): void
  getSingletonDefinitionIds(): ObjectIdentifier[]
  getDefinition(identifier: ObjectIdentifier): IObjectDefinition
  getDefinitionByName(name: string): IObjectDefinition[]
  removeDefinition(identifier: ObjectIdentifier): void
  hasDefinition(identifier: ObjectIdentifier): boolean
  clearAll(): void
  hasObject(identifier: ObjectIdentifier): boolean
  registerObject(identifier: ObjectIdentifier, target: any): void
  getObject(identifier: ObjectIdentifier): any
  getIdentifierRelation(): IIdentifierRelationShip
  setIdentifierRelation(identifierRelation: IIdentifierRelationShip): void
}

export enum ObjectLifeCycleEvent {
  BEFORE_BIND = 'beforeBind',
  BEFORE_CREATED = 'beforeObjectCreated',
  AFTER_CREATED = 'afterObjectCreated',
  AFTER_INIT = 'afterObjectInit',
  BEFORE_DESTROY = 'beforeObjectDestroy'
}

interface ObjectLifeCycleOptions {
  context: IApplicationContext
  definition: IObjectDefinition
}

export interface ObjectBeforeBindOptions extends ObjectLifeCycleOptions {
  replaceCallback: (newDefinition: IObjectDefinition) => void
}

export interface ObjectBeforeCreatedOptions extends ObjectLifeCycleOptions {
  constructorArgs: any[]
}

export interface ObjectCreatedOptions<T> extends ObjectLifeCycleOptions {
  replaceCallback: (ins: T) => void
}

export interface ObjectInitOptions extends ObjectLifeCycleOptions {}

export interface ObjectBeforeDestroyOptions extends ObjectLifeCycleOptions {}

/**
 * Object Lifecycle
 * 对象生命周期
 */
export interface IObjectLifeCycle {
  onBeforeBind(Clzz: any, options: ObjectBeforeBindOptions): void
  onBeforeObjectCreated(Clzz: any, options: ObjectBeforeCreatedOptions): void
  onObjectCreated<T>(ins: T, options: ObjectCreatedOptions<T>): void
  onObjectInit<T>(ins: T, options: ObjectInitOptions): void
  onBeforeObjectDestroy<T>(ins: T, options: ObjectBeforeDestroyOptions): void
}

export type ObjectContext = {
  originName?: string
}

export interface IObjectFactory {
  registry: IObjectDefinitionRegistry
  get<T>(identifier: new (...args: any[]) => T, args?: any[], objectContext?: ObjectContext): T
  get<T>(identifier: ObjectIdentifier, args?: any[], objectContext?: ObjectContext): T
  getAsync<T>(identifier: new (...args: any[]) => T, args?: any[], objectContext?: ObjectContext): Promise<T>
  getAsync<T>(identifier: ObjectIdentifier, args?: any[], objectContext?: ObjectContext): Promise<T>
}

export interface IIdentifierRelationShip {
  saveClassRelation(module: any, namespace?: string): void
  saveFunctionRelation(id: ObjectIdentifier, uuid: string): void
  hasRelation(id: ObjectIdentifier): boolean
  getRelation(id: ObjectIdentifier): string
}

export interface IApplicationContext extends IObjectFactory, WithFn<IObjectLifeCycle>, IModuleStore {
  parent: IApplicationContext
  identifierMapping: IIdentifierRelationShip
  objectCreateEventTarget: EventEmitter | null
  ready(): void | Promise<void>
  stop(): Promise<void>
  registerObject(identifier: ObjectIdentifier, target: any): void
  load(module: any | any[]): void
  hasNamespace(namespace: string): boolean
  getNamespaceList(): string[]
  hasDefinition(identifier: ObjectIdentifier): boolean
  hasObject(identifier: ObjectIdentifier): boolean
  bind<T>(target: T, options?: Partial<IObjectDefinition>): void
  bind<T>(identifier: ObjectIdentifier, target: T, options?: Partial<IObjectDefinition>): void
  bindClass(exports: any, options?: Partial<IObjectDefinition>): void
  createChild(): IApplicationContext
  /**
   * Set value to app attribute map
   * @param key
   * @param value
   */
  setAttr(key: string, value: any): void
  /**
   * Get value from app attribute map
   * @param key
   */
  getAttr<T>(key: string): T
  /**
   * Get instance IoC container scope
   * @param instance
   */
  getInstanceScope(instance: any): ScopeEnum | undefined
}

export interface IConfig {
  /**
   * The logger config
   */
  logger?: LoggerFactoryConfig
}

export interface AppInfo {
  runnerPath: string
  name: string
  version: string
  HOME: string
  env: string
}
// defineConfig 重载方便外面知道参数类型
export const defineConfig = (config: IConfig): IConfig => {
  return config
}

export interface BootstrapOptions {
  /**
   * global config
   */
  globalConfig?: Array<{ [environmentName: string]: Record<string, any> }> | Record<string, any>
  /**
   * application context
   */
  applicationContext?: IApplicationContext
  /**
   * preload modules
   */
  preloadModules?: any[]
  /**
   * import extend ayn
   */
  imports?: any | any[]
}

export interface IFileDetector {
  run(container: IApplicationContext, fileDetectorOptions?: Record<string, any>): void | Promise<void>
  setExtraDetectorOptions(detectorOptions: Record<string, any>): void
}

export interface IConfigService {
  add(configFilePaths: any[]): void
  addObject(obj: object, reverse?: boolean): void
  load(): void
  getConfiguration(configKey?: string): void
  clearAllConfig(): void
}

export interface ISocket {
  getName(): string
  isEnable(): boolean
  run(): Promise<void>
  stop(): Promise<void>
}

export interface ControllerMetadata {
  /**
   * controller class name
   */
  controllerName: string
  /**
   * controller custom name
   */
  customName?: string
}

export interface IpcMetadata {
  /**
   * action name
   */
  propertyKey: string
  /**
   * action method name
   */
  customName?: string
}
export interface EventInfo {
  /**
   * id
   */
  id?: string
  /**
   * event name
   */
  channel: string
  /**
   * handler name
   */
  handlerName: string
  /**
   * action method
   */
  method: string | ((...args: any[]) => void)
}

export type DynamicEventInfo = Omit<EventInfo, 'id' | 'method'>

export interface Context {
  /**
   * Custom properties.
   */
  requestContext: IApplicationContext
  /**
   * 当前请求开始时间
   */
  startTime: number
  /**
   * Set value to app attribute map
   * @param key
   * @param value
   */
  setAttr(key: string, value: any): void

  /**
   * Get value from app attribute map
   * @param key
   */
  getAttr<T>(key: string): T

  /**
   * Check if app attribute map has key
   * @param key
   */
  hasAttr(key: string): boolean
}
