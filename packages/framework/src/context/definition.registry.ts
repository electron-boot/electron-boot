import type {
  IIdentifierRelationShip,
  IObjectDefinition,
  IObjectDefinitionRegistry,
  ObjectIdentifier,
} from "../interface";
import {
  getProviderId,
  getProviderName,
  getProviderUUId,
} from "../decorators/decorator.manager";
import { isEmpty } from "radash";

const PREFIX = "_id_default_";

class LegacyIdentifierRelation
  extends Map<ObjectIdentifier, string>
  implements IIdentifierRelationShip
{
  saveClassRelation(module: any, namespace?: string) {
    const providerId = getProviderUUId(module);
    // save uuid
    this.set(
      providerId,
      typeof providerId === "undefined" ? "" : providerId.toString(),
    );
    if (providerId) {
      // save alias id
      const aliasId = getProviderId(module);
      if (aliasId) {
        // save alias Id
        this.set(aliasId, providerId);
      }
      const providerName = getProviderName(module);
      // save className alias
      this.set(providerName, providerId);
      // save namespace alias
      if (namespace) {
        this.set(
          namespace +
            ":" +
            (typeof providerName === "undefined"
              ? ""
              : providerName.toString()),
          providerId,
        );
      }
    }
  }

  saveFunctionRelation(id: ObjectIdentifier, uuid: string) {
    this.set(uuid, uuid);
    this.set(id, uuid);
  }

  hasRelation(id: ObjectIdentifier): boolean {
    return this.has(id);
  }

  getRelation(id: ObjectIdentifier): string {
    return this.get(id) ?? "";
  }
}

export class ObjectDefinitionRegistry
  extends Map
  implements IObjectDefinitionRegistry
{
  private singletonIds: ObjectIdentifier[] = [];
  private _identifierRelation: IIdentifierRelationShip =
    new LegacyIdentifierRelation();

  get identifierRelation(): IIdentifierRelationShip {
    if (!this._identifierRelation) {
      this._identifierRelation = new LegacyIdentifierRelation();
    }
    return this._identifierRelation;
  }

  set identifierRelation(identifierRelation: IIdentifierRelationShip) {
    this._identifierRelation = identifierRelation;
  }

  get identifiers(): ObjectIdentifier[] {
    const ids: ObjectIdentifier[] = [];
    for (const key of this.keys()) {
      if (key.indexOf(PREFIX) === -1) {
        ids.push(key);
      }
    }
    return ids;
  }

  get count(): number {
    return this.size;
  }

  getSingletonDefinitionIds(): ObjectIdentifier[] {
    return this.singletonIds;
  }

  getDefinitionByName(name: string): IObjectDefinition[] {
    const definitions: IObjectDefinition[] = [];
    for (const v of this.values()) {
      const definition = v as IObjectDefinition;
      if (definition.name === name) {
        definitions.push(definition);
      }
    }
    return definitions;
  }

  registerDefinition(
    identifier: ObjectIdentifier,
    definition: IObjectDefinition,
  ): void {
    if (definition.isSingletonScope()) {
      this.singletonIds.push(identifier);
    }
    this.set(identifier, definition);
  }

  getDefinition(identifier: ObjectIdentifier): IObjectDefinition {
    identifier = this.identifierRelation.getRelation(identifier) ?? identifier;
    return this.get(identifier);
  }

  removeDefinition(identifier: ObjectIdentifier): void {
    this.delete(identifier);
  }

  hasDefinition(identifier: ObjectIdentifier): boolean {
    identifier = this.identifierRelation.getRelation(identifier) ?? identifier;
    return this.has(identifier);
  }

  clearAll(): void {
    this.singletonIds = [];
    this.clear();
  }

  hasObject(identifier: ObjectIdentifier): boolean {
    identifier = this.identifierRelation.getRelation(identifier) ?? identifier;
    return this.has(PREFIX + identifier);
  }

  registerObject(identifier: ObjectIdentifier, target: any): void {
    this.set(PREFIX + isEmpty(identifier) ? "" : isEmpty.toString(), target);
  }

  getObject(identifier: ObjectIdentifier): any {
    identifier = this.identifierRelation.getRelation(identifier) ?? identifier;
    return this.get(PREFIX + identifier);
  }

  getIdentifierRelation(): IIdentifierRelationShip {
    return this.identifierRelation;
  }

  setIdentifierRelation(identifierRelation: IIdentifierRelationShip): void {
    this.identifierRelation = identifierRelation;
  }
}
