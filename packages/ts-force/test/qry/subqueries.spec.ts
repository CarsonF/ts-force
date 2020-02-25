import { buildQuery } from '../../src';
import { Account } from '../assets/sobs';

describe('SubQueries Tests', () => {
  it('select (select x from y)', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: [
          fields.subQuery('contacts', subFields => {
            return {
              select: subFields.select('id', 'name'),
            };
          }),
        ],
      };
    });
    expect(qry).toBe(`SELECT (SELECT Id, Name FROM Contacts) FROM Account`);
  });

  it('select (select x.y, x.z from y)', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: [
          fields.subQuery('contacts', subFields => {
            return {
              select: subFields.parent('owner').select('phone', 'name'),
            };
          }),
        ],
      };
    });
    expect(qry).toBe(
      `SELECT (SELECT Owner.Phone, Owner.Name FROM Contacts) FROM Account`
    );
  });

  it('select (select x.y, x.z from y where x)', () => {
    const qry = buildQuery(Account, fields => {
      return {
        select: [
          fields.subQuery('contacts', subFields => {
            return {
              select: subFields.parent('owner').select('phone', 'name'),
              where: [
                { field: fields.select('phone'), op: '=', val: '828-555-5555' },
              ],
            };
          }),
        ],
      };
    });
    expect(qry).toBe(
      `SELECT (SELECT Owner.Phone, Owner.Name FROM Contacts WHERE Phone = '828-555-5555') FROM Account`
    );
  });
});
