import { Rest } from '../rest';
import { BatchRequest } from './batch';

export interface CompositeRequest extends BatchRequest {
  referenceId: string;
  body?: any;
}

export interface CompositePayload {
  compositeRequest: CompositeRequest[];
}

export interface CompositeResponse {
  body: any;
  httpStatusCode: number;
  referenceId: string;
}

export interface CompositeResult {
  compositeResponse: CompositeResponse[];
}

export class Composite {
  compositeRequest: CompositeRequest[];
  callbacks: Array<(n: CompositeResponse) => void>;
  private readonly client: Rest;

  /**
   * @param  {Rest} client? Optional.  If not set, will use Rest.DEFAULT_CONFIG
   */
  constructor(client?: Rest) {
    this.client = client || new Rest();
    this.compositeRequest = [];
    this.callbacks = [];
  }
  /**
   * @param  {CompositeRequest} request A request to add.
   * @param  {(n:CompositeResponse)=>void} callback? Optional callback that gets passed the response
   * @returns `this` instance for chaining
   */
  addRequest(
    request: CompositeRequest,
    callback?: (n: CompositeResponse) => void
  ): Composite {
    this.compositeRequest.push(request);
    this.callbacks.push(callback);
    return this;
  }

  /**
   * Sends the composite requests
   * @returns Promise<CompositeResult>
   */
  async send(): Promise<CompositeResult> {
    const payload: CompositePayload = {
      compositeRequest: this.compositeRequest,
    };
    const result = (
      await this.client.request.post(
        `/services/data/${this.client.version}/composite`,
        payload
      )
    ).data;

    for (let i = 0; i < this.callbacks.length; i++) {
      const callback = this.callbacks[i];
      if (callback !== undefined) {
        callback(result.compositeResponse[i]);
      }
    }

    return result;
  }
}
