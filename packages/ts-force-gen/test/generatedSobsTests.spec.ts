import { cleanAPIName } from '../src/util';

test('Sanitize Names', () => {
  expect(cleanAPIName('My_Test_Object__c', true)).toBe('MyTestObject');
  expect(cleanAPIName('My_Test_Relation__r', false)).toBe('MyTestRelation');
  expect(cleanAPIName('NS__Test_Object__r', true)).toBe('TestObject');
  expect(cleanAPIName('NS__Test_Object__r', false)).toBe('NSTestObject');
});
