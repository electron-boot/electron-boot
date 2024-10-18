import type { ObjectIdentifier } from "../interface";
import { saveModule, SOCKET_KEY } from "./decorator.manager";
import { Singleton } from "./definitions.decorator";

export const Socket = (identifier?: ObjectIdentifier): ClassDecorator => {
  return (target: any) => {
    saveModule(SOCKET_KEY, target);
    Singleton(identifier)(target);
  };
};
