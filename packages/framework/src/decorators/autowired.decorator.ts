import type { ObjectIdentifier, PropertyParamDecorator } from "../interface";
import { isNullOrUndefined, isNumber } from "../utils/types.util";
import {
  attachClassMetadata,
  INJECT_CUSTOM_PARAM,
  savePropertyInject,
} from "./decorator.manager";

export function Autowired(
  identifier?: ObjectIdentifier,
): PropertyParamDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number,
  ) => {
    if (isNullOrUndefined(parameterIndex) && propertyKey) {
      savePropertyInject({ target, propertyKey, identifier });
    } else if (isNumber(parameterIndex) && isNullOrUndefined(propertyKey)) {
      attachClassMetadata(
        INJECT_CUSTOM_PARAM,
        {
          key: "autowired",
          parameterIndex,
          propertyKey,
          options: { impl: true },
        },
        target,
        propertyKey,
        "multi",
      );
    } else if (isNumber(parameterIndex) && propertyKey) {
      // 保存方法相关信息
      console.warn("Autowired decorator can not use this method parameter");
    }
  };
}
