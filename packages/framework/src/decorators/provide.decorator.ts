import { ObjectIdentifier } from '../interface';
import { saveProviderId } from './decorator.manager';

export function Provide(identifier?: ObjectIdentifier): ClassDecorator {
  return (target: any) => {
    return saveProviderId(<ObjectIdentifier>identifier, target);
  };
}
