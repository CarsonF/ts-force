/* eslint-disable @typescript-eslint/no-misused-promises,no-async-promise-executor */
import {
  OAuth,
  setDefaultConfig,
  Streaming,
  UsernamePasswordConfig,
} from '../../src';
import { DEFAULT_CONFIG } from '../../src/auth/baseConfig';
import { buildQuery } from '../../src/qry';
import { Account, PushTopic } from '../assets/sobs';

const TEST_ACC_NAME = 'testing push topic';

describe('Streaming API', () => {
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
    require('cometd-nodejs-client').adapt();
  });

  it('can connect & disconnect', async () => {
    try {
      const stream = new Streaming();
      await stream.connect();
      expect(stream.isConnected()).toBe(true);
      await stream.disconnect();
      expect(stream.isConnected()).toBe(false);
    } catch (e) {
      console.log(e);
      fail('SHOULD NOT HAVE THROWN ERROR!');
    }
  });

  it('can subscribe & unsubscribe unmapped', async () => {
    // this.retries(3);
    return new Promise(async (resolve, reject) => {
      try {
        // setup topic
        const topic = await getOrCreateTestTopic('UNMAPPEDTEST');

        // run test
        const stream = new Streaming();
        await stream.connect();
        expect(stream.isConnected()).toBe(true);

        // sObject mapping
        await stream.subscribeToTopic<{ Id: string; Name: string }>(
          topic.name,
          e => {
            expect(e.data.sobject.Name).toBe(TEST_ACC_NAME);
            stream
              .unsubscribe(topic.name, 'topic')
              .then(() => topic.delete())
              .then(() => stream.disconnect())
              .then(() => resolve())
              .catch(e => reject(e));
          }
        );

        const acc = new Account({ name: TEST_ACC_NAME });
        await acc.insert();
      } catch (e) {
        reject(e);
      }
    });
  });

  it('can subscribe & unsubscribe mapped', async () => {
    // this.retries(3);
    return new Promise(async (resolve, reject) => {
      try {
        // setup topic
        const topic = await getOrCreateTestTopic('MAPPEDTEST');

        // run test
        const stream = new Streaming();
        await stream.connect();
        expect(stream.isConnected()).toBe(true);

        // sObject mapping
        await stream.subscribeToTopicMapped(Account, topic.name, e => {
          expect(e.data.sObject.name).toBe(TEST_ACC_NAME);
          stream
            .unsubscribe(topic.name, 'topic')
            .then(() => topic.delete())
            .then(() => stream.disconnect())
            .then(() => resolve())
            .catch(e => reject(e));
        });

        const acc = new Account({ name: TEST_ACC_NAME });
        await acc.insert();
      } catch (e) {
        reject(e);
      }
    });
  });
});

async function getOrCreateTestTopic(topicName: string) {
  let topic: PushTopic;
  topic = (
    await PushTopic.retrieve(
      `SELECT Id, Name FROM PushTopic WHERE Name = '${topicName}' AND IsDeleted = false`
    )
  )[0];
  if (!topic) {
    topic = new PushTopic({
      name: topicName,
      notifyForOperationCreate: true,
      description: 'for unit test',
      apiVersion: DEFAULT_CONFIG.version,
      query: buildQuery(Account, f => ({
        select: [...f.select('id', 'name', 'active')],
        // where: [{ field: f.select('name'), val: TEST_ACC_NAME }]
      })),
    });
    await topic.insert();
  }
  return topic;
}
