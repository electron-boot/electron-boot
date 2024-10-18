import {
  EVENT_KEY,
  getClassMetadata,
  saveClassMetadata,
} from "./decorator.manager";
import type { EventMetadata } from "../interface";

export const Event = (customName: string = ""): MethodDecorator => {
  return (target, propertyKey: string | symbol, _descriptor) => {
    let metadata = getClassMetadata<Array<EventMetadata>>(EVENT_KEY, target);
    if (!metadata) {
      metadata = [];
    }
    metadata.push({
      eventName: propertyKey as string,
      customName: customName,
    });
    saveClassMetadata(EVENT_KEY, metadata, target);
  };
};
