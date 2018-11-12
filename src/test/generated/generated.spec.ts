// // tslint:disable:no-unused-expression
import { UsernamePasswordConfig, setDefaultConfig, OAuth, CompositeCollection, SObject, Rest } from '../..';
import { expect } from 'chai';
import { Account, Contact, User } from '../testAssets/sobs';
import 'mocha';

describe('Generated Classes', () => {
    before(async () => {
        const passwordConfig = new UsernamePasswordConfig(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.HOST, process.env.USERNAME, process.env.PASSWORD);
        let oAuth = new OAuth(passwordConfig);
        setDefaultConfig(await oAuth.initialize());
    });

    it('RestObject: Parent Relationship', async () => {
        let acc = new Account({
            name: 'test account',
            website: 'example.com'
        });

        await acc.insert();
        expect(acc.id).to.not.be.null;

        let contact = new Contact({
            accountId: acc.id,
            firstName: `test`,
            lastName: `contact`
        });
        await contact.insert();

        let contact2 = (await Contact.retrieve(`SELECT ${Contact.FIELDS.name}, ${Contact.FIELDS.account}.${Account.FIELDS.website} FROM ${Contact.API_NAME} WHERE Id = '${contact.id}'`))[0];

        expect(contact2.account).to.not.be.null;
        expect(contact2.account.website).to.equal(acc.website);

        await acc.delete();
    });

    it('RestObject: DML End-to-End', async () => {
        let acc = new Account({
            name: 'test account'
        });
        await acc.insert();
        expect(acc.id).to.not.be.null;

        acc.name = 'test name 2';
        await acc.update();

        let acc2 = (await Account.retrieve(`SELECT Name FROM Account WHERE Id = '${acc.id}'`))[0];

        expect(acc2.name).to.equal(acc.name);

        await acc.delete();

        let accounts = await Account.retrieve(`SELECT Name FROM Account WHERE Id = '${acc.id}'`);
        expect(accounts.length).to.equal(0);
    });

    it('RestObject: Stale Memory', async () => {

        let acc = new Account({
            name: 'stale name'
        });
        await acc.insert();
        expect(acc.id).to.not.be.null;

        let acc2 = (await Account.retrieve(`SELECT Id, Name FROM Account WHERE Id = '${acc.id}'`))[0];
        acc2.name = 'new name';
        await acc2.update();

        // should not update in memory values which haven't been explicitly set!
        acc.website = 'example.com';
        await acc.update();

        let acc3 = (await Account.retrieve(`SELECT Name, Website FROM Account WHERE Id = '${acc.id}'`))[0];

        expect(acc3.website).to.equal(acc.website);
        expect(acc3.name).to.equal(acc2.name);

        await acc.delete();
    });

    it('RestObject: refresh', async () => {

        let acc = new Account({
            name: 'test account',
            website: 'www.facepamplet.com'
        });
        await acc.insert();
        let acc2 = (await Account.retrieve(`SELECT Id, Name FROM Account WHERE Id = '${acc.id}'`))[0];
        acc2.name = 'test name 2';
        acc2.billingCity = '23';
        await acc2.update({refresh: true});

        expect(acc2.website).to.equal(acc.website);

        await acc.delete();
    });

    it('RestObject: Collections End-to-End', async () => {
        let acc = new Account({
            name: 'test account'
        });
        await acc.insert();

        let contacts = [];
        const contactSize = 50;
        for (let i = 0; i < contactSize; i++) {
            contacts.push(new Contact({
                accountId: acc.id,
                firstName: `test`,
                lastName: `contact ${i}`
            }));
        }

        let bulk = new CompositeCollection();
        let insertResults = await bulk.insert(contacts);
        insertResults.forEach(r => {
            if (!r.success) {
                throw r.errors.map(e => e.message).join(', ');
            }
        });

        acc = (await Account.retrieve(`SELECT Id, (SELECT ${Contact.FIELDS.name.apiName} FROM ${Account.FIELDS.contacts.apiName}) FROM Account WHERE Id = '${acc.id}'`))[0];

        expect(acc.contacts.length).to.equal(contactSize);

        contacts.forEach(c => {
            c.email = 'test@example.com';
        });

        let updateResults = await bulk.update(contacts);
        updateResults.forEach(r => {
            if (!r.success) {
                throw r.errors.map(e => e.message).join(', ');
            }
        });

        acc = (await Account.retrieve(`SELECT Id, (SELECT ${Contact.FIELDS.name.apiName}, ${Contact.FIELDS.email} FROM ${Account.FIELDS.contacts.apiName}) FROM Account WHERE Id = '${acc.id}'`))[0];
        acc.contacts.forEach(c => {
            expect(c.email).to.equal('test@example.com');
        });

        let delResults = await bulk.delete(contacts);
        delResults.forEach(r => {
            if (!r.success) {
                throw r.errors.map(e => e.message).join(', ');
            }
        });

        acc = (await Account.retrieve(`SELECT Id, (SELECT ${Contact.FIELDS.name.apiName} FROM ${Account.FIELDS.contacts.apiName}) FROM Account WHERE Id = '${acc.id}'`))[0];

        expect(acc.contacts.length).to.equal(0);

        await acc.delete();
    });

    it('should set relation by external id', async () => {
        // setup account
        let accs = await Account.retrieve(f => {
            return {
                select: [
                    ...f.select('id','testExternalId')
                ],
                where: [
                    {field: f.select('testExternalId'), op: '=', val: '123abc'}
                ]
            };
        });
        let acc: Account;
        if (accs.length) {
            acc = accs[0];
        }else {
            acc = new Account({
                name: 'test external id account',
                testExternalId: '123abc'
            });
            await acc.insert();
        }

        let contact = new Contact({
            firstName: 'john',
            lastName: 'doe',
            account: new Account({testExternalId: '123abc'})
        });

        await contact.insert();

        let retCont = await Contact.retrieve(f => {
            return {
                select: [
                    f.select('accountId')
                ],
                where: [
                    {field: f.select('id'), op: '=', val: contact.id}
                ]
            };
        });

        expect(retCont[0].accountId).to.equal(acc.id);

    });

    it('prepareFor Apex', async () => {

        let c = new Contact({
            id: '123',
            accountId: 'abc',
            firstName: `john`,
            lastName: `doe`,
            account: new Account({
                name: 'acme'
            })
        });
        expect(c.prepareFor('apex')).to.deep.equal(
            {
                Id: '123',
                AccountId: 'abc',
                FirstName: 'john',
                LastName: 'doe',
                Account: {
                    Name: 'acme'
                }
            }
        );

        let acc = new Account({
            id: '123',
            contacts: [new Contact({
                firstName: 'john',
                lastName: 'doe'
            })]
        });

        expect(acc.prepareFor('apex')).to.deep.equal(
            {
                Id: '123',
                Contacts: {records: [{ FirstName: 'john', LastName: 'doe' }]}
            }
        );
    });

    it('prepareFor Apex End To End', async () => {
        let acc = new Account({
            id: '123',
            contacts: [new Contact({
                firstName: 'john',
                lastName: 'doe'
            })],
            owner: new User({
                'email': 'example@gmai.com'
            })
        });

        const sfSob = acc.prepareFor('apex');
        try {
            let data = (await new Rest().request.post<SObject>(
                '/services/apexrest/myservice',
                { acc: sfSob }
            )).data;
            const retAcc = Account.fromSFObject(data);
            expect(acc.id).to.deep.equal(retAcc.id);
            expect(acc.contacts[0].firstName).to.deep.equal(retAcc.contacts[0].firstName);
            expect(acc.contacts[0].lastName).to.deep.equal(retAcc.contacts[0].lastName);
            expect(acc.owner.email).to.deep.equal(retAcc.owner.email);
        }catch (e) {
            // console.log(e.request);
            throw e;
        }
    });

});
