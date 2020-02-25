import 'mocha';
import { expect } from 'chai';
import {
  OAuth,
  Rest,
  setDefaultConfig,
  UsernamePasswordConfig,
} from '../../src';

describe('Rest Client', () => {
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

  it('should construct', async () => {
    const client1 = new Rest();
    const client2 = new Rest();

    const clientOther = new Rest({
      accessToken: 'abc',
      instanceUrl: '123',
    });

    expect(client1).to.equal(client2);
    expect(client1).not.to.equal(clientOther);
  });

  it('should capture rest limit from header', async () => {
    const client = new Rest();

    await client.query('SELECT Id FROM Account');

    expect(client.apiLimit.limit).to.be.greaterThan(0);
    expect(client.apiLimit.used).to.be.greaterThan(0);
  });

  it('can call limits endpoint', async () => {
    const client = new Rest();

    const limits = await client.limits();

    expect(limits.DailyStreamingApiEvents.Max).to.be.greaterThan(0);
  });
});
