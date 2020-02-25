import 'mocha';
import { AxiosResponse } from 'axios';
import { expect } from 'chai';
import { parseLimitsFromResponse } from '../../src/rest/utils';

describe('parseLimitsFromResponse', () => {
  it('happy path', () => {
    const fakeResponse: AxiosResponse = {
      headers: {
        'sforce-limit-info': 'api-usage=100/200',
      },
    } as any;
    const result = parseLimitsFromResponse(fakeResponse);
    expect(result.limit).to.equal(200);
    expect(result.used).to.equal(100);
  });
  it('no header', () => {
    const fakeResponse: AxiosResponse = {
      headers: {},
    } as any;
    const result = parseLimitsFromResponse(fakeResponse);
    expect(result).to.be.eql(null);
  });
  it('header invalid format', () => {
    const fakeResponse: AxiosResponse = {
      headers: {
        'sforce-limit-info': 'so-invalid',
      },
    } as any;
    const result = parseLimitsFromResponse(fakeResponse);
    expect(result).to.eql(null);
  });
});
