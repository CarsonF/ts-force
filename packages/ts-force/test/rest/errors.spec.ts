import 'mocha';
import { AxiosError } from 'axios';
import { expect } from 'chai';
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
  before(async () => {
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
      expect(stdErr.type).to.equal('axios');
      const axiosE = stdErr.e as AxiosError;
      expect(axiosE.response.status).to.equal(404);
      expect(stdErr.errorDetails.length).to.equal(1);
      expect(stdErr.errorDetails[0].errorCode).to.equal('NOT_FOUND');
      expect(stdErr.errorDetails[0].message).to.contain(
        'Could not find a match for URL'
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
      expect(stdErr.type).to.equal('axios');
      expect(stdErr.errorDetails.length).to.equal(1);
      expect(stdErr.errorDetails[0].errorCode).to.equal('JSON_PARSER_ERROR');
      expect(stdErr.errorDetails[0].message).to.contain('No such column');
    }
  });

  it('invalid SOQL field', async () => {
    try {
      await Account.retrieve('SELECT asdf FROM ACCOUNT');
      throw new Error('Exception Expected');
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).to.equal('axios');
      expect(stdErr.errorDetails.length).to.equal(1);
      expect(stdErr.errorDetails[0].errorCode).to.equal('INVALID_FIELD');
      expect(stdErr.errorDetails[0].message).to.contain(
        'SELECT asdf FROM ACCOUNT'
      );
    }
  });

  it('bad SOQL', async () => {
    try {
      await Account.retrieve('asdafagw');
      throw new Error('Exception Expected');
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).to.equal('axios');
      expect(stdErr.errorDetails.length).to.equal(1);
      expect(stdErr.errorDetails[0].errorCode).to.equal('MALFORMED_QUERY');
      expect(stdErr.errorDetails[0].message).to.contain('unexpected token');
    }
  });

  it('insert required field missing', async () => {
    try {
      await new Contact({}).insert();
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).to.equal('composite');
      expect(stdErr.errorDetails.length).to.equal(1);
      expect(stdErr.errorDetails[0].errorCode).to.equal(
        'REQUIRED_FIELD_MISSING'
      );
      expect(stdErr.errorDetails[0].message).to.contain(
        'Required fields are missing: [LastName]'
      );
    }
  });

  it('no id set', async () => {
    try {
      await new Account({ name: 'tsterr' }).update();
      throw new Error('update should have failed!');
    } catch (e) {
      const stdErr = getStandardError(e);
      expect(stdErr.type).to.equal('any');
      expect(stdErr.errorDetails.length).to.equal(1);
      expect(stdErr.errorDetails[0].errorCode).to.equal(undefined);
      expect(stdErr.errorDetails[0].message).to.contain(
        'Must have Id to update'
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
      expect(stdErr.type).to.equal('composite');
      expect(stdErr.errorDetails.length).to.equal(1);
      expect(stdErr.errorDetails[0].errorCode).to.equal('MALFORMED_ID');
      expect(stdErr.errorDetails[0].message).to.contain(
        'Owner ID: id value of incorrect type'
      );
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      acc.delete();
    }
  });
});
