import type {
  IApplicationContext,
  IManagedInstance,
  IObjectCreator,
  IObjectDefinition,
  IProperties,
  ObjectIdentifier,
} from "../interface";
import { ScopeEnum } from "../interface";
import { ObjectCreator } from "./object.creator";

class FunctionWrapperCreator extends ObjectCreator {
  doConstruct(Clzz: any, args?: any, context?: IApplicationContext): any {
    if (!Clzz) {
      return null;
    }
    return Clzz(context, args);
  }

  async doConstructAsync(
    Clzz: any,
    args?: any,
    context?: IApplicationContext,
  ): Promise<any> {
    if (!Clzz) {
      return null;
    }

    return Clzz(context, args);
  }
}

export class FunctionDefinition implements IObjectDefinition {
  constructor() {
    this.creator = new FunctionWrapperCreator(this);
  }

  constructMethod!: string;
  constructorArgs: IManagedInstance[] = [];
  creator: IObjectCreator;
  dependsOn!: ObjectIdentifier[];
  destroyMethod!: string;
  export!: string;
  id!: string;
  name!: string;
  initMethod!: string;
  srcPath!: string;
  path: any;
  properties!: IProperties;
  namespace = "";
  asynchronous = true;
  handlerProps = [];
  createFrom;
  allowDowngrade = false;
  // 函数工厂创建的对象默认不需要自动装配
  protected innerAutowire = false;
  protected innerScope: ScopeEnum = ScopeEnum.Singleton;

  getAttr(_key: ObjectIdentifier): any {}

  hasAttr(_key: ObjectIdentifier): boolean {
    return false;
  }

  hasConstructorArgs(): boolean {
    return false;
  }

  hasDependsOn(): boolean {
    return false;
  }

  isAsync(): boolean {
    return this.asynchronous;
  }

  isDirect(): boolean {
    return false;
  }

  isExternal(): boolean {
    return false;
  }

  set scope(scope: ScopeEnum) {
    this.innerScope = scope;
  }

  isSingletonScope(): boolean {
    return this.innerScope === ScopeEnum.Singleton;
  }

  isRequestScope(): boolean {
    return this.innerScope === ScopeEnum.Request;
  }

  setAttr(_key: ObjectIdentifier, _value: any): void {}
}
