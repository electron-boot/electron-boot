import { randomBytes } from "crypto";

/**
 * check str is blank or not
 * @param str
 * @returns {boolean}
 */
export function isBlank(str: string): boolean {
  return str === undefined || str == null || str.length <= 0;
}

/**
 * check str is not blank or not
 * @export
 * @param str
 * @returns {boolean}
 */
export function isNotBlank(str: string): boolean {
  return !isBlank(str);
}

export function generateRandomId(): string {
  return randomBytes(16).toString("hex");
}
