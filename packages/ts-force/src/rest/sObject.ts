import { DEFAULT_CONFIG } from '../auth/baseConfig';
import { SalesforceFieldType, sField } from './sObjectDecorators';

export class SObjectAttributes {
  type: string; // sf apex name
  url: string; // sf rest API url for record
}

/* Base SObject */
export abstract class SObject {
  @sField({
    apiName: 'Id',
    createable: false,
    updateable: false,
    required: false,
    externalId: false,
    reference: null,
    childRelationship: false,
    salesforceType: SalesforceFieldType.ID,
  })
  id: string | undefined;
  attributes: SObjectAttributes;

  constructor(type: string) {
    this.attributes = new SObjectAttributes();
    this.attributes.type = type;
    if (DEFAULT_CONFIG.version) {
      this.attributes.url = `/services/data/v${DEFAULT_CONFIG.version.toFixed(
        1
      )}/sobjects/${this.attributes.type}`;
    }
  }
}
