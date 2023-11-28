import {
  CONTROLLER_KEY,
  saveClassMetadata,
  saveModule,
} from './decorator.manager';
import { ControllerMetadata, ScopeEnum as ScopeEnum } from '../interface';
import { Provide } from './provide.decorator';
import { Scope } from './definitions.decorator';

export const Controller = (customName = ''): ClassDecorator => {
  return target => {
    saveModule(CONTROLLER_KEY, target);
    saveClassMetadata(
      CONTROLLER_KEY,
      {
        customName: customName,
        controllerName: target.name,
      } as ControllerMetadata,
      target
    );
    Scope(ScopeEnum.Request)(target);
    Provide()(target);
  };
};
