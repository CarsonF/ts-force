import { SOQLQueryParams, buildQuery } from '../../src';
import { expect } from 'chai';
import { Account, Contact } from '../assets/sobs';
import 'mocha';

describe('Where Value Tests', () => {
    it('where x = string', () => {
        let qry = buildQuery(Contact, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: '=', val: '123' }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Contact WHERE Name = '123'`);
    });

    it('where x = string (defaulted)', () => {
        let qry = buildQuery(Contact, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), val: '123' }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Contact WHERE Name = '123'`);
    });

    it('where x IN string[]', () => {
        let qry = buildQuery(Contact, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: 'IN', val: ['123', '456'] }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Contact WHERE Name IN ('123', '456')`);
    });

    it('where x IN string[] (defaulted)', () => {
        let qry = buildQuery(Contact, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), val: ['123', '456'] }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Contact WHERE Name IN ('123', '456')`);
    });


    it('where x INCLUDES string[]', () => {
        let qry = buildQuery(Contact, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: 'INCLUDES', val: ['123', '456'] }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Contact WHERE Name INCLUDES ('123', '456')`);
    });

    it('where x = NULL', () => {
        let qry = buildQuery(Contact, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: '=', val: null }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Contact WHERE Name = NULL`);
    });

    it('where x = UNDEFINED', () => {
        let qry = buildQuery(Contact, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: '=', val: undefined }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Contact WHERE Name = NULL`);
    });

    it('where x = number', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('annualRevenue'), op: '>', val: 100 }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Account WHERE AnnualRevenue > 100`);
    });

    it('where x = boolean', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('active'), op: '=', val: false }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Account WHERE Active__c = false`);
    });

    it('where x = DateTime', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    {
                        field: fields.select('createdDate'),
                        op: '=',
                        val: new Date(Date.UTC(1999, 0, 1, 1, 1, 1))
                    }
                ]
            };
        });

        expect(qry).to.equal(`SELECT Id FROM Account WHERE CreatedDate = 1999-01-01T01:01:01.000Z`);
    });

    it('where x = Date', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    {
                        field: fields.select('createdDate'),
                        op: '=',
                        val: new Date(Date.UTC(1999, 0, 1, 1, 1, 1)),
                        dateOnly: true
                    }
                ]
            };
        });

        expect(qry).to.equal(`SELECT Id FROM Account WHERE CreatedDate = 1999-01-01`);
    });

    it('where func(x) = number', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select({ fn: 'COUNT', field: 'id' }), op: '=', val: 1 }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Account WHERE COUNT(Id) = 1`);
    });

    it('where id IN (subqry)', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    {
                        field: fields.select('id'),
                        op: 'IN',
                        subqry: buildQuery(Contact, cFields => {
                            return { select: [cFields.select('accountId')] };
                        })
                    }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Account WHERE Id IN (SELECT AccountId FROM Contact)`);
    });

    it('where id IN (subqry with where)', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    {
                        field: fields.select('id'),
                        op: 'IN',
                        subqry: buildQuery(Contact, cFields => {
                            return {
                                select: [cFields.select('accountId')],
                                where: [
                                    {field: cFields.select('name'), val: 'asdf'}
                                ]
                            };
                        })
                    }
                ]
            };
        });
        expect(qry).to.equal(`SELECT Id FROM Account WHERE Id IN (SELECT AccountId FROM Contact WHERE Name = 'asdf')`);
    });
});

describe('Where Logic Tests', () => {

    it('NOT 1', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: '=', val: '123', not: true }
                ]
            };
        });

        expect(qry).to.equal(`SELECT Id FROM Account WHERE NOT Name = '123'`);
    });

    it('1 AND 2', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: '=', val: '123' },
                    { field: fields.select('annualRevenue'), op: '>=', val: 123 }
                ]
            };
        });

        expect(qry).to.equal(`SELECT Id FROM Account WHERE Name = '123' AND AnnualRevenue >= 123`);
    });

    it('1 OR 2', () => {
        let qry = buildQuery(Account, (fields): SOQLQueryParams => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: '=', val: '123' },
                    'OR',
                    { field: fields.select('annualRevenue'), op: '>=', val: 123 }
                ]
            };
        });

        expect(qry).to.equal(`SELECT Id FROM Account WHERE Name = '123' OR AnnualRevenue >= 123`);
    });

    it('1 AND (2 OR 3)', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: '=', val: '123' },
                    'AND',
                    [
                        { field: fields.select('annualRevenue'), op: '>=', val: 123 },
                        'OR',
                        { field: fields.select('active'), op: '=', val: true }
                    ]
                ]
            };
        });

        expect(qry).to.equal(`SELECT Id FROM Account WHERE Name = '123' AND (AnnualRevenue >= 123 OR Active__c = true)`);
    });

    it('1 AND (2 OR 3) implicit', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: '=', val: '123' },
                    [
                        { field: fields.select('annualRevenue'), op: '>=', val: 123 },
                        'OR',
                        { field: fields.select('active'), op: '=', val: true }
                    ]
                ]
            };
        });

        expect(qry).to.equal(`SELECT Id FROM Account WHERE Name = '123' AND (AnnualRevenue >= 123 OR Active__c = true)`);
    });

    it('(1 OR 2) AND (3 OR 4)', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    [
                        { field: fields.select('name'), op: '=', val: '123' },
                        'OR',
                        { field: fields.select('name'), op: '=', val: '456' }
                    ],
                    'AND',
                    [
                        { field: fields.select('annualRevenue'), op: '>=', val: 123 },
                        'OR',
                        { field: fields.select('active'), op: '=', val: true }
                    ]
                ]
            };
        });

        expect(qry).to.equal(`SELECT Id FROM Account WHERE (Name = '123' OR Name = '456') AND (AnnualRevenue >= 123 OR Active__c = true)`);
    });

    it('1 OR (2 AND (3 OR 4))', () => {
        let qry = buildQuery(Account, fields => {
            return {
                select: [fields.select('id')],
                where: [
                    { field: fields.select('name'), op: '=', val: '123' },
                    'OR',
                    [
                        { field: fields.select('annualRevenue'), op: '>=', val: 123 },
                        'AND',
                        [
                            { field: fields.select('active'), op: '=', val: true },
                            'OR',
                            { field: fields.select('accountSource'), op: '=', val: 'web' }
                        ]
                    ]
                ]
            };
        });

        expect(qry).to.equal(`SELECT Id FROM Account WHERE Name = '123' OR (AnnualRevenue >= 123 AND (Active__c = true OR AccountSource = 'web'))`);
    });

});
