const codeGroup = new Set();
interface ErrorOption {
  cause?: Error;
  status?: number;
}
interface Convertable {
  [key: string]: string | number;
}

type ConvertString<T extends Convertable, Group extends string> = {
  [P in keyof T]: P extends string
    ? T[P] extends number
      ? `${Uppercase<Group>}_${T[P]}`
      : never
    : never;
};

/**
 * Register error group and code, return the standard ErrorCode
 * @param errorGroup
 * @param errorCodeMapping
 */
export function registerErrorCode<T extends Convertable, G extends string>(
  errorGroup: G,
  errorCodeMapping: T,
): ConvertString<T, G> {
  if (codeGroup.has(errorGroup)) {
    throw new BasicError(
      `Error group ${errorGroup} is duplicated, please check before adding.`,
    );
  } else {
    codeGroup.add(errorGroup);
  }
  const newCodeEnum = {} as Convertable;
  // ERROR => GROUP_10000
  for (const errKey in errorCodeMapping) {
    newCodeEnum[errKey as string] =
      errorGroup.toUpperCase() +
      "_" +
      String(errorCodeMapping[errKey]).toUpperCase();
  }
  return newCodeEnum as ConvertString<T, G>;
}

export class BasicError extends Error {
  code: number | string;
  override cause: Error | undefined;

  constructor(message: string, options?: ErrorOption);
  constructor(message: string, code: string, options?: ErrorOption);
  constructor(message: string, code: any, options?: ErrorOption) {
    super(message);
    if (!code || typeof code === "object") {
      options = code;
      code = "MIDWAY_10000";
    }
    this.name = this.constructor.name;
    this.code = code;
    this.cause = options?.cause;
  }
}
