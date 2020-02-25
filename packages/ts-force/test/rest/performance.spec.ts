import 'mocha';
import { expect } from 'chai';
import {
  OAuth,
  Rest,
  setDefaultConfig,
  SObject,
  UsernamePasswordConfig,
} from '../../src';
import { buildQuery } from '../../src/qry';
import { Account } from '../assets/sobs';

let accData: SObject[];

// My lousy attempt to normalize for env...
// Should probably use an actual benchmarking library
const getBaseline = () => {
  const s = new Date();
  for (let i = 0; i < 10000000; i++) {
    // hopefully this doesn't get optimized away
  }
  const e = new Date();
  return e.getTime() - s.getTime();
};

const baseline = getBaseline();

describe('Performance Compare', () => {
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
    const rest = new Rest();
    accData = (
      await rest.query<
        SObject
      >(`SELECT ID, Name, CreatedDate,CreatedBy.Id, CreatedBy.Name,
        CreatedBy.Email, Owner.Id, Owner.Name, Owner.Email,
        (
            SELECT FirstName, AccountId, LastName, Email, Phone, CreatedDate, LastModifiedDate
            FROM Contacts
        )
        FROM ACCOUNT LIMIT 250`)
    ).records;
  });

  it('Object Mapping', async () => {
    const acceptableTime = baseline * 30;
    const start = new Date();
    const accounts = [];

    for (const accRaw of accData) {
      accounts.push(Account.fromSFObject(accRaw));
    }
    const stop = new Date();
    const diff = stop.getTime() - start.getTime();
    expect(diff).to.be.lessThan(acceptableTime);
  });

  it('Query Builder', async () => {
    const acceptableTime = baseline;
    const start = new Date();
    buildQuery(Account, fields => {
      return {
        select: [
          ...fields.select('id', 'name', 'createdDate'),
          ...fields.parent('createdBy').select('id', 'name', 'email'),
          ...fields.parent('owner').select('id', 'name', 'email'),
          fields.subQuery('contacts', cFields => {
            return {
              select: [
                ...cFields.select(
                  'firstName',
                  'lastName',
                  'accountId',
                  'email',
                  'phone',
                  'createdDate',
                  'lastModifiedDate'
                ),
              ],
            };
          }),
        ],
      };
    });
    const stop = new Date();
    const diff = stop.getTime() - start.getTime();
    expect(diff).to.be.lessThan(acceptableTime / 2);
  });
});
