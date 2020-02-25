/* eslint-disable no-prototype-builtins */
import {
  CalendarDate,
  calendarToString,
  getCalendarDate,
} from '../utils/calendarDate';
import {
  BatchResponse,
  Composite,
  CompositeBatch,
  CompositeBatchResult,
  CompositeResponse,
  CompositeResult,
} from './composite';
import { Rest } from './rest';
import {
  getSFieldProps,
  SalesforceFieldType,
  SFieldProperties,
} from './sObjectDecorators';
import { SObject } from './sObject';
import { CompositeError, StandardRestError } from './errors';
import { FieldProps } from '..';

export interface DMLResponse {
  id: string;
  errors: string[];
  success: boolean;
  warnings: string[];
}

const NAME_MAP_CACHE = new Map<string, Map<string, string>>();

/**
 * Abstract Base class which provides DML to Generated SObjects
 * TODO: Need some way to support multiple configurations
 * @export
 * @abstract
 * @class RestObject
 * @extends {SObject}
 */
export abstract class RestObject extends SObject {
  private _client: Rest;

  _modified = new Set<string>();

  constructor(type: string, client?: Rest) {
    super(type);
    this._client = client || new Rest();
  }

  protected initObject(fields?: Partial<FieldProps<RestObject>>) {
    if (fields) {
      if (fields instanceof RestObject) {
        this._modified = fields._modified;
      } else {
        this.setModified(Object.keys(fields) as any);
      }
    }
    Object.assign(this, fields);
  }

  // handler used when proxied
  protected safeUpdateProxyHandler = {
    set: (obj: any, key: keyof any, value: any) => {
      obj[key] = value;
      if (typeof key === 'string') {
        const decorator = getSFieldProps(obj, key);
        if (decorator && decorator.updateable) {
          obj._modified.add(decorator.apiName);
        }
      }
      return true;
    },
  };

  // returns ALL records of a query
  protected static async query<T extends RestObject>(
    type: new () => T,
    qry: string,
    restInstance?: Rest
  ): Promise<T[]> {
    const client = restInstance || new Rest();
    let response = await client.query<T>(qry);
    let records = response.records;

    while (!response.done && response.nextRecordsUrl) {
      response = await client.queryMore<T>(response);
      records = records.concat(response.records);
    }
    const sobs: T[] = records.map(rec => {
      const sob = new type();
      sob._client = client;
      // recursively build up concrete restobjects
      sob.mapFromQuery(rec);
      return sob;
    });

    return sobs;
  }

  protected static getPropertiesMeta<S, T extends RestObject>(
    type: new () => T
  ): { [P in keyof FieldProps<S>]: SFieldProperties } {
    const properties: any = {};
    const sob = new type();
    for (const i in sob) {
      // clean properties
      if (sob.hasOwnProperty(i)) {
        const sFieldProps = getSFieldProps(sob, i);
        if (sFieldProps) {
          properties[i] = sFieldProps;
        }
      }
    }
    return properties;
  }

  handleCompositeUpdateResult = (result: CompositeResponse) => {
    this.id = result.body.id;
  };

  handleCompositeGetResult = (result: CompositeResponse) => {
    this.mapFromQuery(result.body);
  };

  handleCompositeBatchGetResult = (
    result: CompositeBatchResult<SObject, any>
  ) => {
    this.mapFromQuery(result.result);
  };

  async refresh(): Promise<this> {
    if (this.id == null) {
      throw new Error('Must have Id to refresh!');
    }

    const response = (
      await this._client.request.get(`${this.attributes.url}/${this.id}`)
    ).data;

    this.mapFromQuery(response);
    return this;
  }

  /**
   * inserts the sobject to Salesfroce
   *
   * @param {boolean} [refresh] Set to true to apply GET after update
   * @returns {Promise<void>}
   * @memberof RestObject
   */
  async insert(refresh?: boolean): Promise<this> {
    const insertCompositeRef = 'newObject';

    const composite = new Composite(this._client).addRequest(
      {
        method: 'POST',
        url: this.attributes.url,
        referenceId: insertCompositeRef,
        body: this.prepareFor('insert'),
      },
      this.handleCompositeUpdateResult
    );

    if (refresh === true) {
      composite.addRequest(
        {
          method: 'GET',
          url: `${this.attributes.url}/@{${insertCompositeRef}.id}`,
          referenceId: 'getObject',
        },
        this.handleCompositeGetResult
      );
    }

    const compositeResult = await composite.send();
    this.handleCompositeErrors(compositeResult);
    this._modified.clear();
    return this;
  }

  /**
   * Updates the sObject on Salesforce
   * @param {boolean} [refresh] Set to true to apply GET after update
   * @returns {Promise<void>}
   * @memberof RestObject
   */
  async update(opts?: {
    refresh?: boolean;
    sendAllFields?: boolean;
  }): Promise<this> {
    opts = opts || {};
    if (this.id == null) {
      throw new Error('Must have Id to update!');
    }

    const batchRequest = new CompositeBatch(this._client).addUpdate(this, {
      sendAllFields: opts.sendAllFields,
    });

    if (opts.refresh === true) {
      batchRequest.addGet(this, this.handleCompositeBatchGetResult);
    }
    const batchResponse = await batchRequest.send();
    this.handleCompositeBatchErrors(batchResponse);
    this._modified.clear();
    return this;
  }

  /**
   * Deletes the Object from Salesforce
   *
   * @returns {Promise<DMLResponse>}
   * @memberof RestObject
   */
  async delete(): Promise<DMLResponse> {
    if (this.id == null) {
      throw new Error('Must have Id to Delete!');
    }
    const response = (
      await this._client.request.delete(`${this.attributes.url}/${this.id}`)
    ).data;
    return response;
  }

  /**
   * Gets JSON Object from RestObject
   * TODO: Clean this up! Maybe candidate for worst code in this whole project.
   * @param type 'insert' | 'update' | 'update_all' | 'apex'  Determines which fields to include in payload and how to format them.
   * @returns {*} JSON representation of SObject (mapped using decorators)
   * @memberof RestObject
   */
  prepareFor(type: 'insert' | 'update' | 'update_all' | 'apex'): any {
    const data: { [key: string]: any } = {};

    // loop each property
    for (const i in this) {
      // clean properties
      if (this.hasOwnProperty(i)) {
        if (i.toLowerCase() === 'attributes' && type !== 'apex' && this[i]) {
          data[i.toString()] = this[i];
        }
        const sFieldProps = getSFieldProps(this, i);
        if (sFieldProps) {
          if (this[i] === void 0) {
            continue;
          }

          const isReference = sFieldProps.reference != null;
          const isChildArr = sFieldProps.childRelationship === true;
          if (type === 'apex') {
            if (isReference && !isChildArr) {
              data[sFieldProps.apiName] = ((this[
                i
              ] as any) as RestObject).prepareFor('apex');
            } else if (isChildArr) {
              data[sFieldProps.apiName] = {
                records: ((this[i] as any) as RestObject[]).map(obj =>
                  obj.prepareFor('apex')
                ),
              };
            } else {
              // copy with mapping
              data[sFieldProps.apiName] = this.toSFValueFormat(
                sFieldProps,
                this[i]
              );
            }
          } else {
            // standard rest handling
            let canSend: boolean;
            switch (type) {
              case 'update_all':
                canSend = sFieldProps.updateable || isReference;
                break;
              case 'insert':
                canSend = sFieldProps.createable || isReference;
                break;
              case 'update':
                canSend =
                  (sFieldProps.updateable &&
                    this._modified.has(sFieldProps.apiName)) ||
                  isReference;
                break;
            }

            if (!canSend || isChildArr) {
              // remove readonly && reference types
              continue;
            } else if (isReference) {
              // handle external ID references
              if (this[i] && (this as any)[i + 'Id'] === void 0) {
                const relatedSob = (this[i] as any) as RestObject;
                data[
                  sFieldProps.apiName
                ] = relatedSob.prepareAsRelationRecord();
              }
              continue;
            } else {
              // copy with mapping
              data[sFieldProps.apiName] = this.toSFValueFormat(
                sFieldProps,
                this[i]
              );
            }
          }
        }
      }
    }

    return data;
  }

  // helper to get values back in salesforce format
  private toSFValueFormat(sFieldProps: SFieldProperties, value: any) {
    if (sFieldProps.salesforceType === SalesforceFieldType.MULTIPICKLIST) {
      return (value as string[]).join(';');
    } else if (sFieldProps.salesforceType === SalesforceFieldType.DATE) {
      return calendarToString(value as CalendarDate);
    } else {
      return value;
    }
  }

  /**
   * Advanced method used to set a modified API key of a field to send on update
   * @param keys: keys of the object to set the associated field for
   * @memberof RestObject
   */
  setModified = (keys: Array<keyof this>) => {
    keys.forEach(key => {
      if (typeof key === 'string') {
        const decorator = getSFieldProps(this, key);
        if (decorator) {
          this._modified.add(decorator.apiName);
        }
      }
    });
  };

  protected prepareAsRelationRecord() {
    const data: { [key: string]: any } = {};
    // otherwise, find first external Id field
    for (const i in this) {
      // clean properties
      if (this.hasOwnProperty(i)) {
        const sFieldProps = getSFieldProps(this, i);
        if (sFieldProps && sFieldProps.externalId && this[i]) {
          data[sFieldProps.apiName] = this[i];
          return data;
        }
      }
    }
    return undefined;
  }

  // copies data from a json object to restobject
  protected mapFromQuery(data: SObject): this {
    // create a map of lowercase API names -> sob property names
    const apiNameMap = this.getNameMapping(); // should be cached properly

    // loop through returned data
    for (const i in data) {
      if (data.hasOwnProperty(i)) {
        // translate prop name & get decorator
        const sobPropName = apiNameMap.get(i.toLowerCase());
        const sFieldProps = getSFieldProps(this, sobPropName);
        if (!sFieldProps) {
          // no mapping found
          continue;
        }
        if (data[i] === null) {
          if (sFieldProps.childRelationship === true) {
            this[sobPropName] = [];
          } else {
            this[sobPropName] = null;
          }
        } else if (!sFieldProps.reference) {
          let val = data[i];
          if (sFieldProps.salesforceType === SalesforceFieldType.DATETIME) {
            val = new Date(val);
          } else if (sFieldProps.salesforceType === SalesforceFieldType.DATE) {
            val = getCalendarDate(val);
          } else if (
            sFieldProps.salesforceType === SalesforceFieldType.MULTIPICKLIST
          ) {
            val = val.split(';');
          }
          this[sobPropName] = val;
        } else {
          // reference type
          const type: new () => RestObject = sFieldProps.reference();

          if (sFieldProps.childRelationship === true) {
            // child type, map each record
            this[sobPropName] = [];
            if (data[i]) {
              data[i].records.forEach(record => {
                const typeInstance = new type();
                typeInstance._client = this._client;
                this[sobPropName].push(typeInstance.mapFromQuery(record));
              });
            }
          } else {
            const typeInstance = new type();
            typeInstance._client = this._client;
            // parent type.  Map data
            this[sobPropName] = typeInstance.mapFromQuery(data[i]);
          }
        }
      }
    }
    this._modified.clear();
    return this;
  }

  // returns a mapping of API Name (lower case) -> Property Name
  private getNameMapping(): Map<string, string> {
    if (NAME_MAP_CACHE.has(this.attributes.type)) {
      return NAME_MAP_CACHE.get(this.attributes.type);
    }

    const apiNameMap = new Map<string, string>();
    for (const i in this) {
      // clean properties
      if (this.hasOwnProperty(i)) {
        const sFieldProps = getSFieldProps(this, i);
        if (sFieldProps) {
          apiNameMap.set(sFieldProps.apiName.toLowerCase(), i);
        } else {
          apiNameMap.set(i, i);
        }
      }
    }
    NAME_MAP_CACHE.set(this.attributes.type, apiNameMap);
    return apiNameMap;
  }

  private handleCompositeErrors(compositeResult: CompositeResult) {
    const errors: Array<CompositeBatchResult<any, StandardRestError[]>> = [];
    compositeResult.compositeResponse.forEach(batchResult => {
      if (batchResult.httpStatusCode >= 300) {
        const { httpStatusCode: statusCode, body: result } = batchResult;
        errors.push({
          statusCode,
          result,
        });
      }
    });

    if (errors.length) {
      const e = new CompositeError(
        'Failed to execute all Composite Batch Requests'
      );
      e.compositeResponses = errors;
      throw e;
    }
  }

  private handleCompositeBatchErrors(batchResponse: BatchResponse) {
    if (batchResponse.hasErrors) {
      const errors: Array<CompositeBatchResult<any, StandardRestError[]>> = [];
      batchResponse.results.forEach(batchResult => {
        if (batchResult.statusCode >= 300) {
          errors.push(batchResult);
        }
      });
      const e = new CompositeError(
        'Failed to execute all Composite Batch Requests'
      );
      e.compositeResponses = errors;
      throw e;
    }
  }
}
