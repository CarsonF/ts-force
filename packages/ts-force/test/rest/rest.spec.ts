import {
  OAuth,
  Rest,
  setDefaultConfig,
  UsernamePasswordConfig,
} from '../../src';

describe('Rest Client', () => {
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

  test('should construct', async () => {
    const client1 = new Rest();
    const client2 = new Rest();

    const clientOther = new Rest({
      accessToken: 'abc',
      instanceUrl: '123',
    });

    expect(client1).toBe(client2);
    expect(client1).not.toBe(clientOther);
  });

  test('should capture rest limit from header', async () => {
    const client = new Rest();

    await client.query('SELECT Id FROM Account');

    expect(client.apiLimit.limit).toBeGreaterThan(0);
    expect(client.apiLimit.used).toBeGreaterThan(0);
  });

  test('can call limits endpoint', async () => {
    const client = new Rest();

    const limits = await client.limits();

    expect(limits.DailyStreamingApiEvents.Max).toBeGreaterThan(0);
  });
});
