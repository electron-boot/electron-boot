import type {
  IObjectCreator,
  IObjectDefinition,
  ObjectIdentifier,
} from "../interface";
import { ScopeEnum } from "../interface";
import { ObjectProperties } from "./properties.definition";
import { ObjectCreator } from "./object.creator";

export class ObjectDefinition implements IObjectDefinition {
  protected _attrs = new Map<ObjectIdentifier, any>();
  protected _asynchronous = false;
  scope: ScopeEnum = ScopeEnum.Singleton;
  creator: IObjectCreator;
  id!: string;
  name!: string;
  initMethod!: string;
  destroyMethod!: string;
  constructMethod!: string;
  constructorArgs: any[] = [];
  srcPath!: string;
  path: any;
  export!: string;
  dependsOn: ObjectIdentifier[] = [];
  properties = new ObjectProperties();
  namespace = "";
  handlerProps = [];
  createFrom;
  allowDowngrade = false;

  constructor() {
    this.creator = new ObjectCreator(this);
  }

  set asynchronous(asynchronous: boolean) {
    this._asynchronous = asynchronous;
  }

  isAsync(): boolean {
    return this._asynchronous;
  }

  isSingletonScope(): boolean {
    return this.scope === ScopeEnum.Singleton;
  }

  isRequestScope(): boolean {
    return this.scope === ScopeEnum.Request;
  }

  hasDependsOn(): boolean {
    return this.dependsOn.length > 0;
  }

  hasConstructorArgs(): boolean {
    return this.constructorArgs.length > 0;
  }

  getAttr(key: ObjectIdentifier): any {
    return this._attrs.get(key);
  }

  hasAttr(key: ObjectIdentifier): boolean {
    return this._attrs.has(key);
  }

  setAttr(key: ObjectIdentifier, value: any): void {
    this._attrs.set(key, value);
  }
}
