import { AxiosError } from 'axios';
import {
  getStandardError,
  OAuth,
  Rest,
  setDefaultConfig,
  SObject,
  UsernamePasswordConfig,
} from '../../src';
import { Account, Contact } from '../assets/sobs';

describe('Error Handlers', () => {
  beforeAll(async () => {
    const passwordConfig = new UsernamePasswordConfig(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.HOST,
      process.env.USERNAME,
      process.env.PASSWORD
    );
    const oAuth = new OAuth(passwordConfig);
    setDefaultConfig(await oAuth.initialize());
  });

  it('404', async () => {
    try {
      await new Rest().request.post<SObject>('/services/apexrest/asdf');
      throw new Error('Exception Expected');
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).toBe('axios');
      const axiosE = stdErr.e as AxiosError;
      expect(axiosE.response.status).toBe(404);
      expect(stdErr.errorDetails.length).toBe(1);
      expect(stdErr.errorDetails[0].errorCode).toBe('NOT_FOUND');
      expect(stdErr.errorDetails[0].message).toEqual(
        expect.arrayContaining(['Could not find a match for URL'])
      );
    }
  });

  it('bad request', async () => {
    try {
      await new Rest().request.post<SObject>('/services/apexrest/myservice', {
        acc: { asdf: 'not valid' },
      });
      throw new Error('Exception Expected');
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).toBe('axios');
      expect(stdErr.errorDetails.length).toBe(1);
      expect(stdErr.errorDetails[0].errorCode).toBe('JSON_PARSER_ERROR');
      expect(stdErr.errorDetails[0].message).toEqual(
        expect.arrayContaining(['No such column'])
      );
    }
  });

  it('invalid SOQL field', async () => {
    try {
      await Account.retrieve('SELECT asdf FROM ACCOUNT');
      throw new Error('Exception Expected');
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).toBe('axios');
      expect(stdErr.errorDetails.length).toBe(1);
      expect(stdErr.errorDetails[0].errorCode).toBe('INVALID_FIELD');
      expect(stdErr.errorDetails[0].message).toEqual(
        expect.arrayContaining(['SELECT asdf FROM ACCOUNT'])
      );
    }
  });

  it('bad SOQL', async () => {
    try {
      await Account.retrieve('asdafagw');
      throw new Error('Exception Expected');
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).toBe('axios');
      expect(stdErr.errorDetails.length).toBe(1);
      expect(stdErr.errorDetails[0].errorCode).toBe('MALFORMED_QUERY');
      expect(stdErr.errorDetails[0].message).toEqual(
        expect.arrayContaining(['unexpected token'])
      );
    }
  });

  it('insert required field missing', async () => {
    try {
      await new Contact({}).insert();
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).toBe('composite');
      expect(stdErr.errorDetails.length).toBe(1);
      expect(stdErr.errorDetails[0].errorCode).toBe('REQUIRED_FIELD_MISSING');
      expect(stdErr.errorDetails[0].message).toEqual(
        expect.arrayContaining(['Required fields are missing: [LastName]'])
      );
    }
  });

  it('no id set', async () => {
    try {
      await new Account({ name: 'tsterr' }).update();
      throw new Error('update should have failed!');
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).toBe('any');
      expect(stdErr.errorDetails.length).toBe(1);
      expect(stdErr.errorDetails[0].errorCode).toBeUndefined();
      expect(stdErr.errorDetails[0].message).toEqual(
        expect.arrayContaining(['Must have Id to update'])
      );
    }
  });

  it('update invalid id field', async () => {
    const acc = await new Account({ name: 'tsterr' }).insert();
    try {
      acc.ownerId = '12341';
      await acc.update();
      throw new Error('update should have failed!');
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).toBe('composite');
      expect(stdErr.errorDetails.length).toBe(1);
      expect(stdErr.errorDetails[0].errorCode).toBe('MALFORMED_ID');
      expect(stdErr.errorDetails[0].message).toEqual(
        expect.arrayContaining(['Owner ID: id value of incorrect type'])
      );
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      acc.delete();
    }
  });
});
