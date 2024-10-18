import { saveObjectDefinition } from "./decorator.manager";
import type { ObjectIdentifier } from "../interface";
import { ScopeEnum as ScopeEnum } from "../interface";
import { Provide } from "./provide.decorator";

export function Init(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    saveObjectDefinition(target, { initMethod: propertyKey });
  };
}

export function Destroy(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    saveObjectDefinition(target, {
      destroyMethod: propertyKey,
    });
  };
}

export function Scope(
  scope: ScopeEnum,
  scopeOptions?: { allowDowngrade?: boolean },
): ClassDecorator {
  return function (target: any): void {
    saveObjectDefinition(target, { scope, ...scopeOptions });
  };
}

export function Singleton(identifier?: ObjectIdentifier): ClassDecorator {
  return function (target: any): void {
    Scope(ScopeEnum.Singleton)(target);
    Provide(identifier)(target);
  };
}
