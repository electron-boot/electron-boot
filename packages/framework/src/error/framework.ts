import { BasicError, registerErrorCode } from "./base";
import type { ObjectIdentifier } from "../interface";

export const FrameworkErrorEnum = registerErrorCode("framework", {
  UNKNOWN: 10000,
  COMMON: 10001,
  PARAM_TYPE: 10002,
  DEFINITION_NOT_FOUND: 10003,
  FEATURE_NO_LONGER_SUPPORTED: 10004,
  FEATURE_NOT_IMPLEMENTED: 10004,
  MISSING_CONFIG: 10006,
  MISSING_RESOLVER: 10007,
  DUPLICATE_ROUTER: 10008,
  USE_WRONG_METHOD: 10009,
  SINGLETON_INJECT_REQUEST: 10010,
  MISSING_IMPORTS: 10011,
  UTIL_HTTP_TIMEOUT: 10012,
  INCONSISTENT_VERSION: 10013,
  INVALID_CONFIG: 10014,
  DUPLICATE_CLASS_NAME: 10015,
  DUPLICATE_CONTROLLER_PREFIX_OPTIONS: 10016,
  RETRY_OVER_MAX_TIME: 10017,
  INVOKE_METHOD_FORBIDDEN: 10018,
  CODE_INVOKE_TIMEOUT: 10019,
} as const);
export class CommonError extends BasicError {
  constructor(message: string) {
    super(message, FrameworkErrorEnum.COMMON);
  }
}
export class MissingImportComponentError extends BasicError {
  constructor(originName: string) {
    const text = `"${originName}" can't inject and maybe forgot add "{imports: [***]}" in @Configuration.`;
    super(text, FrameworkErrorEnum.MISSING_IMPORTS);
  }
}

export class ResolverMissingError extends BasicError {
  constructor(type: string) {
    super(
      `Resolver "${type}" is missing.`,
      FrameworkErrorEnum.MISSING_RESOLVER,
    );
  }
}
export class SingletonInjectRequestError extends BasicError {
  constructor(singletonScopeName: string, requestScopeName: string) {
    const text = `${singletonScopeName} with singleton scope can't implicitly inject ${requestScopeName} with request scope directly, please add "@Scope(ScopeEnum.Request, { allowDowngrade: true })" in ${requestScopeName} or use "ctx.requestContext.getAsync(${requestScopeName})".`;
    super(text, FrameworkErrorEnum.SINGLETON_INJECT_REQUEST);
  }
}
export class ParameterError extends BasicError {
  constructor(message?: string) {
    super(message ?? "Parameter type not match", FrameworkErrorEnum.PARAM_TYPE);
  }
}
export class UseWrongMethodError extends BasicError {
  constructor(
    wrongMethod: string,
    replacedMethod: string,
    describeKey?: string,
  ) {
    const text = describeKey
      ? `${describeKey} not valid by ${wrongMethod}, Use ${replacedMethod} instead!`
      : `You should not invoked by ${wrongMethod}, Use ${replacedMethod} instead!`;
    super(text, FrameworkErrorEnum.USE_WRONG_METHOD);
  }
}

export class InvalidConfigError extends BasicError {
  constructor(message?: string) {
    super(
      "Invalid config file \n" + message,
      FrameworkErrorEnum.INVALID_CONFIG,
    );
  }
}
export class DuplicateEventError extends BasicError {
  constructor(routerUrl: string, existPos: string, existPosOther: string) {
    super(
      `Duplicate router "${routerUrl}" at "${existPos}" and "${existPosOther}"`,
      FrameworkErrorEnum.DUPLICATE_ROUTER,
    );
  }
}
export class DefinitionNotFoundError extends BasicError {
  static readonly type = Symbol.for("#NotFoundError");
  static isClosePrototypeOf(ins: DefinitionNotFoundError): boolean {
    if (ins) {
      return ins[DefinitionNotFoundError.type] === DefinitionNotFoundError.type;
    }
    return false;
  }
  constructor(identifier: ObjectIdentifier) {
    super(
      `${typeof identifier === "undefined" ? "" : identifier.toString()} is not valid in current context`,
      FrameworkErrorEnum.DEFINITION_NOT_FOUND,
    );
    this[DefinitionNotFoundError.type] = DefinitionNotFoundError.type;
  }
  updateErrorMsg(className: string): void {
    const identifier = this.message.split(
      " is not valid in current context",
    )[0];
    this.message = `${identifier} in class ${className} is not valid in current context`;
  }
}
