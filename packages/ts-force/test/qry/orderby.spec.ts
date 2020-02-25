import { expect } from 'chai';
import { buildQuery } from '../../src';
import { Account } from '../assets/sobs';
import 'mocha';

describe('Order By Tests', () => {
  it('order by x', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: [fields.select('id')],
        orderBy: { field: fields.select('accountNumber') },
      };
    });
    expect(qry).to.equal('SELECT Id FROM Account ORDER BY AccountNumber');
  });

  it('order by x asc, y.z desc', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: [fields.select('id')],
        orderBy: [
          {
            field: fields.select('accountNumber'),
            order: 'ASC',
          },
          {
            field: fields.parent('owner').select('email'),
            order: 'DESC',
          },
        ],
      };
    });

    expect(qry).to.equal(
      'SELECT Id FROM Account ORDER BY AccountNumber ASC, Owner.Email DESC'
    );
  });

  it('order by x desc null last', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: [fields.select('id')],
        orderBy: [
          {
            field: fields.select('accountNumber'),
            order: 'DESC',
            nulls: 'LAST',
          },
        ],
      };
    });
    expect(qry).to.equal(
      'SELECT Id FROM Account ORDER BY AccountNumber DESC NULLS LAST'
    );
  });
});
