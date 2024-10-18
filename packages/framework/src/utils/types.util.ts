import { types } from "util";

const ToString = Function.prototype.toString;
const hasOwn = Object.prototype.hasOwnProperty;
const toStr = Object.prototype.toString;

const anonRegex =
  /^function\s+\(|^function\s+anonymous\(|^\(?(?:\w+,)*\w+\)?\s*=>|^\(\s*\)\s*=>/;
const classRegex = /^\s*class\s+\w+/;
/**
 * check target is string or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isString(target: any): boolean {
  return typeof target === "string";
}
/**
 * check target is number or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isNumber(target: any): boolean {
  return typeof target === "number";
}
/**
 * check target is boolean or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isBoolean(target: any): boolean {
  return typeof target === "boolean";
}
/**
 * check target is null or not.
 * @export
 * @returns {boolean}
 * @param target
 */
export function isNull(target: any): boolean {
  return target == null;
}
/**
 * check target is undefined or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isUndefined(target: any): boolean {
  return typeof target === "undefined";
}

/**
 * check target is (string or symbol) or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isIdentifier(target: any): boolean {
  return typeof target === "string" || typeof target === "symbol";
}

/**
 * check target is (null or undefined) or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isNullOrUndefined(target: any): boolean {
  return isNull(target) || isUndefined(target);
}
/**
 * check target is array or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isArray(target: any): boolean {
  return Array.isArray(target);
}

/**
 * check target is regexp or not.
 * @param obj
 * @returns {boolean}
 */
export function isRegExp(obj: any): boolean {
  return toStr.call(obj) === "[object RegExp]";
}

/**
 * check target is plain object or not.
 * @param target
 */
export function isPlainObject(target: any): boolean {
  if (!target || toStr.call(target) !== "[object Object]") {
    return false;
  }

  const hasOwnConstructor = hasOwn.call(target, "constructor");
  const hasIsPrototypeOf =
    target.constructor &&
    target.constructor.prototype &&
    hasOwn.call(target.constructor.prototype, "isPrototypeOf");
  // Not own constructor property must be Object
  if (target.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
    return false;
  }

  // Own properties are enumerated firstly, so to speed up,
  // if last one its own, then all properties are own.
  let key;
  for (key in target) {
    /**/
  }

  return typeof key === "undefined" || hasOwn.call(target, key);
}
/**
 * check target is function or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isFunction(target: any): boolean {
  return typeof target === "function";
}
/**
 * check target is generator function or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isGeneratorFunction(target: any): boolean {
  return types.isGeneratorFunction(target);
}

/**
 * check target is async function or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isAsyncFunction(target: any): boolean {
  return types.isAsyncFunction(target);
}

/**
 * check target is promise or not.
 * @export
 * @param target
 * @returns {boolean}
 */
export function isPromise(target: any): boolean {
  return types.isPromise(target);
}
/**
 * check target is primitive type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isPrimitiveType(target: any): boolean {
  return (
    target === Function ||
    target === Object ||
    target === String ||
    target === Number ||
    target === Boolean ||
    target === Symbol
  );
}
/**
 * is metadata object or not.
 *
 * @export
 * @param {*} target
 * @param {...(string|string[])[]} props
 * @returns {boolean}
 */
export function isMetadataObject(
  target: any,
  ...props: (string | string[])[]
): boolean {
  if (!isPlainObject(target)) {
    return false;
  }
  if (props.length) {
    return Object.keys(target).some((n) =>
      props.some((ps) => (isString(ps) ? ps === n : ps.indexOf(n) > 0)),
    );
  }
  return true;
}

/**
 * check target is class or not.
 * @param target
 * @param exclude
 */
export function isClass(
  target: any,
  exclude?: (target: any) => boolean,
): boolean {
  if (!isFunction(target)) return false;
  if (!target.name || !target.prototype) return false;
  if (target.prototype.constructor !== target) return false;
  if (exclude && exclude(target)) return false;
  if (isPrimitiveType(target)) return false;
  if (anonRegex.test(ToString.call(target))) return false;
  if (classRegex.test(ToString.call(target))) return true;
  return Object.getOwnPropertyNames(target).indexOf("caller") < 0;
}
