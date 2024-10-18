import { isNull, isPlainObject } from "./types.util";

export function merge(target: any, src: any): any {
  if (!target) {
    target = src;
    src = null;
  }
  if (!target) {
    return null;
  }
  if (Array.isArray(target)) {
    return target.concat(src || []);
  }
  if (typeof target === "object") {
    return Object.assign({}, target, src);
  }
  throw new Error("can not merge meta that type of " + typeof target);
}
export function extend(...args: any[]): any {
  let options, name, src, copy, clone;
  let target = args[0];
  let i = 1;
  const length = args.length;
  let deep = false;

  // Handle a deep copy situation
  if (typeof target === "boolean") {
    deep = target;
    target = args[1] || {};
    // skip the boolean and the target
    i = 2;
  } else if (
    (typeof target !== "object" && typeof target !== "function") ||
    target == null
  ) {
    target = {};
  }

  for (; i < length; ++i) {
    options = args[i];
    // Only deal with non-null/undefined values
    if (options == null) continue;

    // Extend the base object
    for (name in options) {
      if (name === "__proto__") continue;

      src = target[name];
      copy = options[name];

      // Prevent never-ending loop
      if (target === copy) continue;

      // Recurse if we're merging plain objects
      if (deep && copy && isPlainObject(copy)) {
        clone = src && isPlainObject(src) ? src : {};
        // Never move original objects, clone them
        target[name] = extend(deep, clone, copy);

        // Don't bring in undefined values
      } else if (typeof copy !== "undefined") {
        target[name] = copy;
      }
    }
  }

  // Return the modified object
  return target;
}
/**
 *  @example
 *  safelyGet(['a','b'],{a: {b: 2}})  // => 2
 *  safelyGet(['a','b'],{c: {b: 2}})  // => undefined
 *  safelyGet(['a','1'],{a: {"1": 2}})  // => 2
 *  safelyGet(['a','1'],{a: {b: 2}})  // => undefined
 *  safelyGet('a.b',{a: {b: 2}})  // => 2
 *  safelyGet('a.b',{c: {b: 2}})  // => undefined
 */
export function safelyGet(
  list: string | string[],
  obj?: Record<string, unknown>,
): any {
  if (arguments.length === 1) {
    return (_obj: Record<string, unknown>) => safelyGet(list, _obj);
  }

  if (typeof obj === "undefined" || typeof obj !== "object" || isNull(obj)) {
    return void 0;
  }
  const pathArrValue = typeof list === "string" ? list.split(".") : list;
  let willReturn: any = obj;

  for (const key of pathArrValue) {
    if (typeof willReturn === "undefined" || isNull(willReturn)) {
      return void 0;
    } else if (typeof willReturn !== "object") {
      return void 0;
    }
    willReturn = willReturn[key];
  }

  return willReturn;
}
