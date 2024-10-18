import type {
  GroupModeType,
  IModuleStore,
  MethodDecoratorOptions,
  ObjectDefinitionOptions,
  ObjectIdentifier,
  ParamDecoratorOptions,
  TagClsMetadata,
  TagPropsMetadata,
  TSDesignType,
} from "../interface";
import { InjectMode } from "../interface";
import { getModuleRequirePathList } from "../utils/path.util";
import "reflect-metadata";
import { generateRandomId } from "../utils/string.util";
import { isClass, isNullOrUndefined } from "../utils/types.util";
import { merge } from "../utils/object.util";
import { camel } from "radash";

export const ALL = "common:all_value_key";
// common
export const ASPECT_KEY = "common:aspect";
export const CONFIGURATION_KEY = "common:configuration";
export const SOCKET_KEY = "common:socket";
export const CONTROLLER_KEY = "common:controller";
export const EVENT_KEY = "common:event";
export const CONFIG_KEY = "config";
export const APPLICATION_CONTEXT_KEY = "__application_context__";
export const PRELOAD_MODULE_KEY = "INJECTION_PRELOAD_MODULE_KEY";
export const INJECT_CLASS_KEY_PREFIX = "INJECTION_CLASS_META_DATA";
export const TAGGED_CLS = "injection:tagged_class";
export const INJECT_TAG = "inject";
export const OBJ_DEF_CLS = "injection:object_definition_class";
// pipeline
export const PIPELINE_IDENTIFIER = "__pipeline_identifier__";
export const INJECT_CUSTOM_PROPERTY = "inject_custom_property";
// The name inject custom param decorator with resolver
export const INJECT_CUSTOM_METHOD = "inject_custom_method";
// The name inject custom param decorator with resolver
export const INJECT_CUSTOM_PARAM = "inject_custom_param";
export const MAIN_MODULE_KEY = "__main__";
export class DecoratorManager extends Map implements IModuleStore {
  /**
   * the key for meta data store in class
   */
  injectClassKeyPrefix = INJECT_CLASS_KEY_PREFIX;
  /**
   * the key for method meta data store in class
   */
  injectClassMethodKeyPrefix = "INJECTION_CLASS_METHOD_META_DATA";

  /**
   * the key for method meta data store in method
   */
  injectMethodKeyPrefix = "INJECTION_METHOD_META_DATA";

  container: IModuleStore | undefined;

  saveModule(key: ObjectIdentifier, module: any): void {
    if (this.container) {
      return this.container.saveModule(key, module);
    }
    if (!this.has(key)) {
      this.set(key, new Set());
    }
    this.get(key).add(module);
  }

  listModule(key: ObjectIdentifier): any[] {
    if (this.container) {
      return this.container.listModule(key);
    }
    return Array.from(this.get(key) || {});
  }

  resetModule(key: ObjectIdentifier): void {
    this.set(key, new Set());
  }

  bindContainer(container: IModuleStore): void {
    this.container = container;
    this.container.transformModule && this.container.transformModule(this);
  }

  static getDecoratorClassKey(decoratorNameKey: ObjectIdentifier): string {
    return decoratorNameKey!.toString() + "_CLS";
  }

  static removeDecoratorClassKeySuffix(
    decoratorNameKey: ObjectIdentifier,
  ): string {
    return decoratorNameKey!.toString().replace("_CLS", "");
  }

  static getDecoratorMethodKey(decoratorNameKey: ObjectIdentifier): string {
    return decoratorNameKey!.toString() + "_METHOD";
  }

  static getDecoratorClsExtendedKey(
    decoratorNameKey: ObjectIdentifier,
  ): string {
    return decoratorNameKey!.toString() + "_EXT";
  }

  static getDecoratorClsMethodPrefix(
    decoratorNameKey: ObjectIdentifier,
  ): string {
    return decoratorNameKey!.toString() + "_CLS_METHOD";
  }

  static getDecoratorClsMethodKey(
    decoratorNameKey: ObjectIdentifier,
    methodKey: ObjectIdentifier,
  ): string {
    return (
      DecoratorManager.getDecoratorClsMethodPrefix(decoratorNameKey) +
      ":" +
      methodKey!.toString()
    );
  }

  static getDecoratorMethod(
    decoratorNameKey: ObjectIdentifier,
    methodKey: ObjectIdentifier,
  ): string {
    return (
      DecoratorManager.getDecoratorMethodKey(decoratorNameKey) +
      "_" +
      methodKey!.toString()
    );
  }

  static saveMetadata(
    metaKey: string,
    target: any,
    dataKey: string,
    data: any,
  ): void {
    // filter Object.create(null)
    if (typeof target === "object" && target.constructor) {
      target = target.constructor;
    }

    let m: Map<string, any>;
    if (Reflect.hasOwnMetadata(metaKey, target)) {
      m = Reflect.getMetadata(metaKey, target);
    } else {
      m = new Map<string, any>();
    }

    m.set(dataKey, data);
    Reflect.defineMetadata(metaKey, m, target);
  }

  static attachMetadata(
    metaKey: string,
    target: any,
    dataKey: string,
    data: any,
    groupBy?: string | symbol,
    groupMode: GroupModeType = "one",
  ): void {
    // filter Object.create(null)
    if (typeof target === "object" && target.constructor) {
      target = target.constructor;
    }

    let m: Map<string, any>;
    if (Reflect.hasOwnMetadata(metaKey, target)) {
      m = Reflect.getMetadata(metaKey, target);
    } else {
      m = new Map<string, any>();
    }

    if (!m.has(dataKey)) {
      if (groupBy) {
        m.set(dataKey, {});
      } else {
        m.set(dataKey, []);
      }
    }
    if (groupBy) {
      if (groupMode === "one") {
        m.get(dataKey)[groupBy] = data;
      } else {
        if (m.get(dataKey)[groupBy]) {
          m.get(dataKey)[groupBy].push(data);
        } else {
          m.get(dataKey)[groupBy] = [data];
        }
      }
    } else {
      m.get(dataKey).push(data);
    }
    Reflect.defineMetadata(metaKey, m, target);
  }

  static getMetadata(metaKey: string, target: any, dataKey?: string): any {
    // filter Object.create(null)
    if (typeof target === "object" && target.constructor) {
      target = target.constructor;
    }

    let m: Map<string, any>;
    if (!Reflect.hasOwnMetadata(metaKey, target)) {
      m = new Map<string, any>();
      Reflect.defineMetadata(metaKey, m, target);
    } else {
      m = Reflect.getMetadata(metaKey, target);
    }
    if (!dataKey) {
      return m;
    }
    return m.get(dataKey);
  }

  /**
   * save metadata to class or property
   * @param decoratorNameKey the alias name for decorator
   * @param data the data you want to store
   * @param target target class
   * @param propertyName
   */
  saveMetadata(
    decoratorNameKey: ObjectIdentifier,
    data: any,
    target: any,
    propertyName?: string | symbol,
  ): void {
    if (propertyName) {
      const dataKey = DecoratorManager.getDecoratorMethod(
        decoratorNameKey,
        propertyName,
      );
      DecoratorManager.saveMetadata(
        this.injectMethodKeyPrefix,
        target,
        dataKey,
        data,
      );
    } else {
      const dataKey = DecoratorManager.getDecoratorClassKey(decoratorNameKey);
      DecoratorManager.saveMetadata(
        this.injectClassKeyPrefix,
        target,
        dataKey,
        data,
      );
    }
  }

  /**
   * attach data to class or property
   * @param decoratorNameKey
   * @param data
   * @param target
   * @param propertyName
   * @param groupBy
   */
  attachMetadata(
    decoratorNameKey: ObjectIdentifier,
    data: any,
    target: any,
    propertyName?: string | symbol,
    groupBy?: string | symbol,
    groupMode?: GroupModeType,
  ): void {
    if (propertyName) {
      const dataKey = DecoratorManager.getDecoratorMethod(
        decoratorNameKey,
        propertyName,
      );
      DecoratorManager.attachMetadata(
        this.injectMethodKeyPrefix,
        target,
        dataKey,
        data,
        groupBy,
        groupMode,
      );
    } else {
      const dataKey = DecoratorManager.getDecoratorClassKey(decoratorNameKey);
      DecoratorManager.attachMetadata(
        this.injectClassKeyPrefix,
        target,
        dataKey,
        data,
        groupBy,
        groupMode,
      );
    }
  }

  /**
   * get single data from class or property
   * @param decoratorNameKey
   * @param target
   * @param propertyName
   */
  getMetadata(
    decoratorNameKey: ObjectIdentifier,
    target: any,
    propertyName?: string | symbol,
  ): any {
    if (propertyName) {
      const dataKey = DecoratorManager.getDecoratorMethod(
        decoratorNameKey,
        propertyName,
      );
      return DecoratorManager.getMetadata(
        this.injectMethodKeyPrefix,
        target,
        dataKey,
      );
    } else {
      const dataKey = `${DecoratorManager.getDecoratorClassKey(
        decoratorNameKey,
      )}`;
      return DecoratorManager.getMetadata(
        this.injectClassKeyPrefix,
        target,
        dataKey,
      );
    }
  }

  /**
   * save property data to class
   * @param decoratorNameKey
   * @param data
   * @param target
   * @param propertyName
   */
  savePropertyDataToClass(
    decoratorNameKey: ObjectIdentifier,
    data: any,
    target: any,
    propertyName: string | symbol,
  ): void {
    const dataKey = DecoratorManager.getDecoratorClsMethodKey(
      decoratorNameKey,
      propertyName,
    );
    DecoratorManager.saveMetadata(
      this.injectClassMethodKeyPrefix,
      target,
      dataKey,
      data,
    );
  }

  /**
   * attach property data to class
   * @param decoratorNameKey
   * @param data
   * @param target
   * @param propertyName
   * @param groupBy
   */
  attachPropertyDataToClass(
    decoratorNameKey: ObjectIdentifier,
    data: any,
    target: any,
    propertyName: string | symbol,
    groupBy?: string,
  ): void {
    const dataKey = DecoratorManager.getDecoratorClsMethodKey(
      decoratorNameKey,
      propertyName,
    );
    DecoratorManager.attachMetadata(
      this.injectClassMethodKeyPrefix,
      target,
      dataKey,
      data,
      groupBy,
    );
  }

  /**
   * get property data from class
   * @param decoratorNameKey
   * @param target
   * @param propertyName
   */
  getPropertyDataFromClass(
    decoratorNameKey: ObjectIdentifier,
    target: any,
    propertyName: string | symbol,
  ): any {
    const dataKey = DecoratorManager.getDecoratorClsMethodKey(
      decoratorNameKey,
      propertyName,
    );
    return DecoratorManager.getMetadata(
      this.injectClassMethodKeyPrefix,
      target,
      dataKey,
    );
  }

  /**
   * list property data from class
   * @param decoratorNameKey
   * @param target
   */
  listPropertyDataFromClass(
    decoratorNameKey: ObjectIdentifier,
    target: any,
  ): any[] {
    const originMap = DecoratorManager.getMetadata(
      this.injectClassMethodKeyPrefix,
      target,
    );
    const res: any[] = [];
    for (const [key, value] of originMap) {
      if (
        key.indexOf(
          DecoratorManager.getDecoratorClsMethodPrefix(decoratorNameKey),
        ) !== -1
      ) {
        res.push(value);
      }
    }
    return res;
  }
}

let manager = new DecoratorManager();
if (typeof global === "object") {
  if (global["ELECTRON_APPLICATION_DECORATOR_MANAGER"]) {
    console.warn(
      'DecoratorManager not singleton and please check @electron-boot/framework version by "npm ls @electron-boot/framework"',
    );
    const coreModulePathList = getModuleRequirePathList(
      "@electron-boot/framework",
    );
    if (coreModulePathList.length) {
      console.info("The module may be located in:");
      coreModulePathList.forEach((path: string, index: number) => {
        console.info(`${index + 1}. ${path}`);
      });
    }
    manager = global["ELECTRON_APPLICATION_DECORATOR_MANAGER"];
  } else {
    global["ELECTRON_APPLICATION_DECORATOR_MANAGER"] = manager;
  }
}

/**
 * P data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param groupBy
 */
export function attachClassMetadata(
  decoratorNameKey: ObjectIdentifier,
  data: any,
  target: any,
  groupBy?: string | symbol,
  groupMode?: GroupModeType,
): void {
  return manager.attachMetadata(
    decoratorNameKey,
    data,
    target,
    undefined,
    groupBy,
    groupMode,
  );
}

/**
 * save data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param mergeIfExist
 */
export function saveClassMetadata(
  decoratorNameKey: ObjectIdentifier,
  data: any,
  target: any,
  mergeIfExist?: boolean,
): void {
  if (mergeIfExist && typeof data === "object") {
    const originData = manager.getMetadata(decoratorNameKey, target);
    if (!originData) {
      return manager.saveMetadata(decoratorNameKey, data, target);
    }
    if (Array.isArray(originData)) {
      return manager.saveMetadata(
        decoratorNameKey,
        originData.concat(data),
        target,
      );
    } else {
      return manager.saveMetadata(
        decoratorNameKey,
        Object.assign(originData, data),
        target,
      );
    }
  } else {
    return manager.saveMetadata(decoratorNameKey, data, target);
  }
}

/**
 * get data from class
 * @param decoratorNameKey
 * @param target
 */
export function getClassMetadata<T = any>(
  decoratorNameKey: ObjectIdentifier,
  target: any,
): T {
  return manager.getMetadata(decoratorNameKey, target);
}

/**
 * save property data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function savePropertyDataToClass(
  decoratorNameKey: ObjectIdentifier,
  data: any,
  target: any,
  propertyName: any,
): void {
  return manager.savePropertyDataToClass(
    decoratorNameKey,
    data,
    target,
    propertyName,
  );
}

/**
 * attach property data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 * @param groupBy
 */
export function attachPropertyDataToClass(
  decoratorNameKey: ObjectIdentifier,
  data: any,
  target: any,
  propertyName: any,
  groupBy?: string,
): void {
  return manager.attachPropertyDataToClass(
    decoratorNameKey,
    data,
    target,
    propertyName,
    groupBy,
  );
}

/**
 * get property data from class
 * @param decoratorNameKey
 * @param target
 * @param propertyName
 */
export function getPropertyDataFromClass<T = any>(
  decoratorNameKey: ObjectIdentifier,
  target: any,
  propertyName: any,
): T {
  return manager.getPropertyDataFromClass(
    decoratorNameKey,
    target,
    propertyName,
  );
}

/**
 * list property data from class
 * @param decoratorNameKey
 * @param target
 */
export function listPropertyDataFromClass(
  decoratorNameKey: ObjectIdentifier,
  target: any,
): any[] {
  return manager.listPropertyDataFromClass(decoratorNameKey, target);
}

/**
 * save property data
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function savePropertyMetadata(
  decoratorNameKey: ObjectIdentifier,
  data: any,
  target: any,
  propertyName: any,
): void {
  return manager.saveMetadata(decoratorNameKey, data, target, propertyName);
}

/**
 * attach property data
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function attachPropertyMetadata(
  decoratorNameKey: ObjectIdentifier,
  data: any,
  target: any,
  propertyName: any,
): void {
  return manager.attachMetadata(decoratorNameKey, data, target, propertyName);
}

/**
 * get property data
 * @param decoratorNameKey
 * @param target
 * @param propertyName
 */
export function getPropertyMetadata<T = any>(
  decoratorNameKey: ObjectIdentifier,
  target: any,
  propertyName: any,
): T {
  return manager.getMetadata(decoratorNameKey, target, propertyName);
}

/**
 * save preload module by target
 * @param target
 */
export function savePreloadModule(target: any): void {
  return saveModule(PRELOAD_MODULE_KEY, target);
}

/**
 * list preload module
 */
export function listPreloadModule(): any[] {
  return listModule(PRELOAD_MODULE_KEY);
}

/**
 * save module to inner map
 * @param decoratorNameKey
 * @param target
 */
export function saveModule(
  decoratorNameKey: ObjectIdentifier,
  target: any,
): void {
  if (isClass(target)) {
    saveProviderId(undefined, target);
  }
  return manager.saveModule(decoratorNameKey, target);
}

export function bindContainer(container: IModuleStore): void {
  return manager.bindContainer(container);
}

export function clearBindContainer(): void {
  return (manager.container = undefined);
}

/**
 * list module from decorator key
 * @param decoratorNameKey
 * @param filter
 */
export function listModule(
  decoratorNameKey: ObjectIdentifier,
  filter?: (module) => boolean,
): any[] {
  const modules = manager.listModule(decoratorNameKey);
  if (filter) {
    return modules.filter(filter);
  } else {
    return modules;
  }
}

/**
 * reset module
 * @param decoratorNameKey
 */
export function resetModule(decoratorNameKey: ObjectIdentifier): void {
  return manager.resetModule(decoratorNameKey);
}

/**
 * save class object definition
 * @param target class
 * @param props property data
 */
export function saveObjectDefinition(target: any, props = {}): any {
  saveClassMetadata(OBJ_DEF_CLS, props, target, true);
  return target;
}

/**
 * get class object definition from metadata
 * @param target
 */
export function getObjectDefinition(target: any): ObjectDefinitionOptions {
  return getClassExtendedMetadata(OBJ_DEF_CLS, target);
}

/**
 * get property inject args
 * @param target
 * @param useCache
 */
export function getPropertyInject(
  target: any,
  useCache?: boolean,
): {
  [methodName: string]: TagPropsMetadata;
} {
  return getClassExtendedMetadata(INJECT_TAG, target, undefined, useCache);
}

/**
 * get data from class and proto
 * @param decoratorNameKey
 * @param target
 * @param propertyName
 * @param useCache
 */
export function getClassExtendedMetadata<T = any>(
  decoratorNameKey: ObjectIdentifier,
  target: any,
  propertyName?: string,
  useCache?: boolean,
): T {
  if (useCache === undefined) {
    useCache = true;
  }
  const extKey = DecoratorManager.getDecoratorClsExtendedKey(decoratorNameKey);
  let metadata = manager.getMetadata(extKey, target, propertyName);
  if (useCache && metadata !== undefined) {
    return metadata;
  }
  const father = Reflect.getPrototypeOf(target);
  if (father && father.constructor !== Object) {
    metadata = merge(
      getClassExtendedMetadata(
        decoratorNameKey,
        father,
        propertyName,
        useCache,
      ),
      manager.getMetadata(decoratorNameKey, target, propertyName),
    );
  }
  manager.saveMetadata(extKey, metadata || null, target, propertyName);
  return metadata;
}

/**
 * class provider id
 * @param identifier id
 * @param target class
 */
export function saveProviderId(identifier: ObjectIdentifier, target: any): any {
  if (isProvide(target)) {
    if (identifier) {
      const meta = getClassMetadata(TAGGED_CLS, target);
      if (meta.id !== identifier) {
        meta.id = identifier;
        // save class id and uuid
        saveClassMetadata(TAGGED_CLS, meta, target);
      }
    }
  } else {
    // save
    const uuid = generateRandomId();
    // save class id and uuid
    saveClassMetadata(
      TAGGED_CLS,
      {
        id: identifier,
        originName: target.name,
        uuid,
        name: camel(target.name),
      },
      target,
    );
  }
  return target;
}

/**
 * get provider id from module
 * @param module
 */
export function getProviderId(module: any): ObjectIdentifier {
  const metaData = getClassMetadata(TAGGED_CLS, module) as TagClsMetadata;
  if (metaData && metaData.id) {
    return metaData.id;
  }
  return undefined;
}

/**
 * get provider name from module
 * @param module
 */
export function getProviderName(module: any): ObjectIdentifier {
  const metaData = getClassMetadata(TAGGED_CLS, module) as TagClsMetadata;
  if (metaData && metaData.name) {
    return metaData.name;
  }
  return undefined;
}

/**
 * get provider uuid from module
 * @param module
 */
export function getProviderUUId(module: any): string | undefined {
  const metaData = getClassMetadata(TAGGED_CLS, module) as TagClsMetadata;
  if (metaData && metaData.uuid) {
    return metaData.uuid;
  }
  return undefined;
}

/**
 * use @Provide decorator or not
 * @param target class
 */
export function isProvide(target: any): boolean {
  return !!getClassMetadata(TAGGED_CLS, target);
}

export function transformTypeFromTSDesign(designFn: any): TSDesignType {
  if (isNullOrUndefined(designFn)) {
    return { name: "undefined", isBaseType: true, originDesign: designFn };
  }

  switch (designFn.name) {
    case "String":
      return { name: "string", isBaseType: true, originDesign: designFn };
    case "Number":
      return { name: "number", isBaseType: true, originDesign: designFn };
    case "Boolean":
      return { name: "boolean", isBaseType: true, originDesign: designFn };
    case "Symbol":
      return { name: "symbol", isBaseType: true, originDesign: designFn };
    case "Object":
      return { name: "object", isBaseType: true, originDesign: designFn };
    case "Function":
      return { name: "function", isBaseType: true, originDesign: designFn };
    default:
      return {
        name: designFn.name,
        isBaseType: false,
        originDesign: designFn,
      };
  }
}

/**
 * save property inject args
 * @param opts 参数
 */
export function savePropertyInject(opts: {
  // id
  identifier: ObjectIdentifier | undefined;
  // class
  target: any;
  // propertyKey
  propertyKey: string | symbol;
  args?: any;
}): void {
  // 1、use identifier by user
  let identifier = opts.identifier;
  let injectMode = InjectMode.Identifier;
  // 2、use identifier by class uuid
  if (!identifier) {
    const type = getPropertyType(opts.target, opts.propertyKey);
    if (
      !type.isBaseType &&
      isClass(type.originDesign) &&
      isProvide(type.originDesign)
    ) {
      identifier = getProviderUUId(type.originDesign);
      injectMode = InjectMode.Class;
    }
    if (!identifier) {
      // 3、use identifier by property name
      identifier = opts.propertyKey;
      injectMode = InjectMode.PropertyName;
    }
  }
  attachClassMetadata(
    INJECT_TAG,
    {
      targetKey: opts.propertyKey, // 注入的属性名
      value: identifier, // 注入的 id
      args: opts.args, // 注入的其他参数
      injectMode,
    },
    opts.target,
    opts.propertyKey.toString(),
  );
}

export enum BaseType {
  Boolean = "boolean",
  Number = "number",
  String = "string",
}

/**
 * get parameters type by reflect-metadata
 */
export function getMethodParamTypes(
  target: any,
  methodName: string | symbol,
): any {
  if (isClass(target)) {
    target = target.prototype;
  }
  return Reflect.getMetadata("design:paramtypes", target, methodName);
}

/**
 * get property(method) type from metadata
 * @param target
 * @param methodName
 */
export function getPropertyType(
  target: any,
  methodName: string | symbol,
): TSDesignType {
  return transformTypeFromTSDesign(
    Reflect.getMetadata("design:type", target, methodName),
  );
}

/**
 * create a custom property inject
 * @param decoratorKey
 * @param metadata
 * @param impl default true, configuration need decoratorService.registerMethodHandler
 */
export function createCustomPropertyDecorator(
  decoratorKey: string,
  metadata: any,
  impl = true,
): PropertyDecorator {
  return function (target: any, propertyName: string | symbol): void {
    attachClassMetadata(
      INJECT_CUSTOM_PROPERTY,
      {
        propertyName,
        key: decoratorKey,
        metadata,
        impl,
      },
      target,
      propertyName,
    );
  };
}

/**
 *
 * @param decoratorKey
 * @param metadata
 * @param implOrOptions
 */
export function createCustomMethodDecorator(
  decoratorKey: string,
  metadata: any,
  implOrOptions: boolean | MethodDecoratorOptions = { impl: true },
): MethodDecorator {
  if (typeof implOrOptions === "boolean") {
    implOrOptions = { impl: implOrOptions } as MethodDecoratorOptions;
  }
  if (implOrOptions.impl === undefined) {
    implOrOptions.impl = true;
  }
  return function (
    target: any,
    propertyName: string | symbol,
    _descriptor: TypedPropertyDescriptor<any>,
  ) {
    attachClassMetadata(
      INJECT_CUSTOM_METHOD,
      {
        propertyName,
        key: decoratorKey,
        metadata,
        options: implOrOptions,
      },
      target,
    );
  };
}
/**
 *
 * @param decoratorKey
 * @param metadata
 * @param options
 */
export function createCustomParamDecorator(
  decoratorKey: string,
  metadata: any,
  implOrOptions: boolean | ParamDecoratorOptions = { impl: true },
): ParameterDecorator {
  if (typeof implOrOptions === "boolean") {
    implOrOptions = { impl: implOrOptions } as ParamDecoratorOptions;
  }
  if (implOrOptions.impl === undefined) {
    implOrOptions.impl = true;
  }
  return function (
    target: any,
    propertyName: string | symbol | undefined,
    parameterIndex: number,
  ) {
    attachClassMetadata(
      INJECT_CUSTOM_PARAM,
      {
        key: decoratorKey,
        parameterIndex,
        propertyName,
        metadata,
        options: implOrOptions,
      },
      target,
      propertyName,
      "multi",
    );
  };
}
