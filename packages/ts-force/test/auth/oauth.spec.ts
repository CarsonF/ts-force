import { setDefaultConfig } from '../../src/auth/baseConfig';
import { OAuth, UsernamePasswordConfig } from '../../src/auth/oauth';
import { Rest } from '../../src/rest/rest';

const passwordConfig = new UsernamePasswordConfig(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.HOST,
  process.env.USERNAME,
  process.env.PASSWORD
);

describe('env test', () => {
  it('should load params form ENV', () => {
    const req = passwordConfig.reqBody();
    expect(req.client_id).toEqual(process.env.CLIENT_ID);
    expect(req.client_secret).toEqual(process.env.CLIENT_SECRET);
    expect(req.grant_type).toEqual('password');
    expect(req.password).toEqual(process.env.PASSWORD);
    expect(req.username).toEqual(process.env.USERNAME);
  });
});

describe('OAuth Test', () => {
  it('should load params form ENV', async () => {
    const auth = new OAuth(passwordConfig);
    await auth.initialize();
    expect(auth.accessToken).not.toEqual('');
    expect(auth.instanceUrl).not.toEqual('');
  });

  it('Get Token', async () => {
    const auth = new OAuth(passwordConfig);
    await auth.initialize();
    expect(auth.accessToken).not.toEqual('');
    expect(auth.instanceUrl).not.toEqual('');
  });

  it('Valid Passthrough to Rest Configs and Query Call', async () => {
    const auth = new OAuth(passwordConfig);
    setDefaultConfig(await auth.initialize());
    // start a new REST instance to see if proplery filled out
    const rest = new Rest();
    const response = await rest.query('SELECT Id FROM Account');
    // assume we have at least one account to play with
    expect(response.totalSize).toBeGreaterThan(0);
  });
});
