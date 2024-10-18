import {
  APPLICATION_CONTEXT_KEY,
  CONFIG_KEY,
  createCustomPropertyDecorator,
} from "./decorator.manager";

export function Config(identifier?: string): PropertyDecorator {
  return createCustomPropertyDecorator(CONFIG_KEY, {
    identifier,
  });
}
export function ApplicationContext(): PropertyDecorator {
  return createCustomPropertyDecorator(APPLICATION_CONTEXT_KEY, {});
}
