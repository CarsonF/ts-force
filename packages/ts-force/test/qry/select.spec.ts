import { buildQuery } from '../../src';
import { Account, Contact } from '../assets/sobs';

describe('Select Tests', () => {
  it('select x', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: [fields.select('accountNumber')],
      };
    });
    expect(qry).toBe('SELECT AccountNumber FROM Account');
  });

  it('select x, y', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: fields.select('accountNumber', 'active', 'website'),
      };
    });
    expect(qry).toBe('SELECT AccountNumber, Active__c, Website FROM Account');
  });

  it('select x with arr arg', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: fields.select(['accountNumber']),
      };
    });
    expect(qry).toBe('SELECT AccountNumber FROM Account');
  });

  it('select x, y with arr arg', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: fields.select(['accountNumber', 'active', 'website']),
      };
    });
    expect(qry).toBe('SELECT AccountNumber, Active__c, Website FROM Account');
  });

  it('select x.y', () => {
    const qry = buildQuery(Contact, fields => {
      return {
        select: [fields.parent('account').select('accountNumber')],
      };
    });
    expect(qry).toBe('SELECT Account.AccountNumber FROM Contact');
  });

  it('select x.y.z', () => {
    const qry = buildQuery(Contact, fields => {
      return {
        select: [
          fields
            .parent('account')
            .parent('owner')
            .select('name'),
        ],
      };
    });

    expect(qry).toBe('SELECT Account.Owner.Name FROM Contact');
  });

  it('select x.y, x.z', () => {
    const qry = buildQuery(Contact, fields => {
      return {
        select: fields.parent('account').select('accountNumber', 'active'),
      };
    });
    expect(qry).toBe(
      'SELECT Account.AccountNumber, Account.Active__c FROM Contact'
    );
  });

  it('select x, y, z.a, z.b', () => {
    const qry = buildQuery(Contact, fields => {
      return {
        select: [
          ...fields.select('accountId', 'email'),
          ...fields.parent('account').select('accountNumber', 'active'),
        ],
      };
    });
    expect(qry).toBe(
      'SELECT AccountId, Email, Account.AccountNumber, Account.Active__c FROM Contact'
    );
  });

  it('select COUNT(x) c', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: [
          fields.select({ fn: 'COUNT', field: 'accountNumber', alias: 'c' }),
        ],
      };
    });
    expect(qry).toBe('SELECT COUNT(AccountNumber) c FROM Account');
  });

  it('select COUNT(x), x, y, COUNT(y)', () => {
    const qry = buildQuery(Contact, fields => {
      return {
        select: fields.select(
          'assistantName',
          { field: 'createdById', fn: 'AVG' },
          'accountId',
          { field: 'assistantPhone', fn: 'CALENDAR_MONTH' }
        ),
      };
    });
    expect(qry).toBe(
      'SELECT AssistantName, AVG(CreatedById), AccountId, CALENDAR_MONTH(AssistantPhone) FROM Contact'
    );
  });
});
