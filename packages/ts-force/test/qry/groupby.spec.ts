import { buildQuery } from '../../src';
import { Account } from '../assets/sobs';

describe('Group By Tests', () => {
  it('group by x', () => {
    const builder = buildQuery(Account, fields => {
      return {
        select: [fields.select({ fn: 'COUNT', field: 'id', alias: 'c' })],
        groupBy: {
          field: fields.select('accountSource'),
        },
      };
    });

    expect(builder).toBe(
      'SELECT COUNT(Id) c FROM Account GROUP BY AccountSource'
    );
  });

  it('group by x, y', () => {
    const builder = buildQuery(Account, fields => {
      return {
        select: [fields.select({ fn: 'COUNT', field: 'id', alias: 'c' })],
        groupBy: {
          field: fields.select('accountSource', 'type'),
        },
      };
    });
    expect(builder).toBe(
      'SELECT COUNT(Id) c FROM Account GROUP BY AccountSource, Type'
    );
  });

  it('group by CUBE(x, y)', () => {
    const builder = buildQuery(Account, fields => {
      return {
        select: [fields.select({ fn: 'COUNT', field: 'id', alias: 'c' })],
        groupBy: {
          field: fields.select('accountSource', 'type'),
          type: 'CUBE',
        },
      };
    });

    expect(builder).toBe(
      'SELECT COUNT(Id) c FROM Account GROUP BY CUBE(AccountSource, Type)'
    );
  });

  it('group by x having x > 1', () => {
    const builder = buildQuery(Account, fields => {
      return {
        select: [fields.select({ fn: 'COUNT', field: 'id', alias: 'c' })],
        groupBy: {
          field: fields.select('type'),
          having: [
            {
              field: fields.select({ fn: 'COUNT', field: 'id' }),
              op: '>',
              val: 1,
            },
          ],
        },
      };
    });

    expect(builder).toBe(
      'SELECT COUNT(Id) c FROM Account GROUP BY Type HAVING COUNT(Id) > 1'
    );
  });
});
