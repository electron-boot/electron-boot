import { Level } from './interface';

/**
 * Convert str to Level
 * @param level {string} - level str
 */
export function formatLevel(level: string): Level {
  return level.toLowerCase() as Level;
}

/**
 * if name is undefined or name, throw error
 * @param name
 * @param message
 */
export function assertEmptyAndThrow(name: string, message: any) {
  if (name === null || name === undefined) {
    throw new Error(message);
  }
}

/**
 * 只要有一个 false 就返回 true
 * 默认为 undefined, null, false 时返回 true
 * @param args
 */
export function assertConditionTruthy(...args: any[]): boolean {
  if (args && args.length) {
    for (const param of args) {
      if (param !== true) {
        continue;
      } else {
        return false;
      }
    }
  }
  return true;
}

/**
 * render template to str
 * @param str {string} - template str
 * @param data {Record<string,any>} - template data
 */
export function template(str: string, data: Record<string, any>) {
  return str.replace(/\${(.*?)}/g, (match, key) => data[key]);
}
const toStr = Object.prototype.toString;
const hasOwn = Object.prototype.hasOwnProperty;
/**
 * check target is plain object or not.
 * @param target
 */
export function isPlainObject(target: any) {
  if (!target || toStr.call(target) !== '[object Object]') {
    return false;
  }

  const hasOwnConstructor = hasOwn.call(target, 'constructor');
  const hasIsPrototypeOf =
    target.constructor &&
    target.constructor.prototype &&
    hasOwn.call(target.constructor.prototype, 'isPrototypeOf');
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

  return typeof key === 'undefined' || hasOwn.call(target, key);
}
