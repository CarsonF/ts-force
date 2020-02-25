import { AxiosResponse } from 'axios';
import { parseLimitsFromResponse } from '../../src/rest/utils';

describe('parseLimitsFromResponse', () => {
  it('happy path', () => {
    const fakeResponse: AxiosResponse = {
      headers: {
        'sforce-limit-info': 'api-usage=100/200',
      },
    } as any;
    const result = parseLimitsFromResponse(fakeResponse);
    expect(result.limit).toBe(200);
    expect(result.used).toBe(100);
  });
  it('no header', () => {
    const fakeResponse: AxiosResponse = {
      headers: {},
    } as any;
    const result = parseLimitsFromResponse(fakeResponse);
    expect(result).toEqual(null);
  });
  it('header invalid format', () => {
    const fakeResponse: AxiosResponse = {
      headers: {
        'sforce-limit-info': 'so-invalid',
      },
    } as any;
    const result = parseLimitsFromResponse(fakeResponse);
    expect(result).toEqual(null);
  });
});
