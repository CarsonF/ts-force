import 'reflect-metadata';

import { RestObject } from './restObject';

export enum SalesforceFieldType {
  DATE = 'date',
  DATETIME = 'datetime',
  BOOLEAN = 'boolean',
  DOUBLE = 'double',
  INTEGER = 'integer',
  CURRENCY = 'currency',
  REFERENCE = 'reference',
  STRING = 'string',
  PICKLIST = 'picklist',
  TEXTAREA = 'textarea',
  ADDRESS = 'address',
  PHONE = 'phone',
  URL = 'url',
  MULTIPICKLIST = 'multipicklist',
  PERCENT = 'percent',
  EMAIL = 'email',
  INT = 'int',
  LOCATION = 'location',
  ID = 'id',
  BASE64 = 'base64',
  ANYTYPE = 'anytype',
  TIME = 'time',
  ENCRYPTEDSTRING = 'encryptedstring',
}
const sFieldMetadataKey = Symbol('sField');

export class SFieldProperties {
  apiName: string;
  updateable: boolean;
  createable: boolean;
  reference: () => new () => RestObject;
  required: boolean;
  externalId: boolean;
  childRelationship: boolean;
  salesforceType: SalesforceFieldType;
  salesforceLabel?: string;

  // override to string to make it easy to use with query building
  toString = (): string => {
    return this.apiName;
  };
}

export function sField(props: SFieldProperties) {
  return Reflect.metadata(sFieldMetadataKey, props);
}

export function getSFieldProps(
  target: any,
  propertyKey: string
): SFieldProperties {
  let prop = Reflect.getMetadata(sFieldMetadataKey, target, propertyKey);
  if (prop) {
    prop = Object.assign(new SFieldProperties(), prop);
  }
  return prop;
}
