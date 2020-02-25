import { Omit } from '../types';
import {
  dateFormatter,
  dateTimeFormatter,
  listFormatter,
  NULL,
  stringFormatter,
} from './formatters';

export type Operator = '=' | '!=' | '<=' | '>=' | '>' | '<' | 'LIKE';

export type ListOperator = 'IN' | 'NOT IN' | 'INCLUDES' | 'EXCLUDES';

export type LogicalOperator = 'AND' | 'OR';
export type PrimValue = string | number | boolean;
export type DateValue = Date;
export type ListValue = string[];
export type Value = PrimValue | DateValue | ListValue;
export interface BaseCondition {
  field: string;
  not?: boolean;
  formatter?: (d: Value) => string | string[];
}
export type PrimitiveConditionParams = {
  op?: Operator;
  val: PrimValue;
} & BaseCondition;
export type ListConditionParams = {
  op?: ListOperator;
  val: ListValue;
} & BaseCondition;
export type DateConditionParams = {
  op?: Operator;
  val: DateValue;
  dateOnly?: boolean;
} & BaseCondition;
export type SubQueryConditionParams = {
  op: ListOperator;
  subqry: string;
} & Omit<BaseCondition, 'formatter'>;
export type ConditionParams =
  | PrimitiveConditionParams
  | SubQueryConditionParams
  | ListConditionParams
  | DateConditionParams;
export type ConditionsList = Conditions[];
export type Conditions = ConditionParams | LogicalOperator | ConditionsList;

export type ConditionalClause = Conditions[];

export function composeConditionalClause(where: ConditionalClause): string {
  let ret = '';
  where.forEach(c => {
    if (isCondition(c)) {
      const cond = composeConditional(c);
      if (ret.length && !(ret.endsWith('AND ') || ret.endsWith('OR '))) {
        ret += ' AND ';
      }
      ret += cond;
    } else if (typeof c === 'string') {
      ret += ` ${c} `;
    } else if (Array.isArray(c)) {
      if (ret.length && !(ret.endsWith('AND ') || ret.endsWith('OR '))) {
        ret += ' AND ';
      }
      ret += `(${composeConditionalClause(c)})`;
    }
  });
  return ret;
}

function composeConditional(params: ConditionParams) {
  const { field, not } = params;
  let operator = params.op;
  let val: string | string[];

  if (isSubQueryCondition(params)) {
    val = `(${params.subqry})`;
  } else if (params.formatter) {
    // overridden by custom formatter
    val = params.formatter(params.val);
  } else if (isDateCondition(params)) {
    if (params.dateOnly) {
      val = dateFormatter(params.val);
    } else {
      val = dateTimeFormatter(params.val);
    }
  } else {
    // primitive/list conditions
    const primVal = params.val;
    if (params.formatter) {
      val = params.formatter(primVal);
    } else {
      // render defaults
      if (primVal === undefined || primVal === null) {
        val = NULL;
      } else if (typeof primVal === 'number' || typeof primVal === 'boolean') {
        val = primVal.toString();
      } else if (Array.isArray(primVal)) {
        if (!operator) {
          // default operator
          operator = 'IN';
        }
        val = listFormatter(primVal);
      } else {
        val = stringFormatter(primVal);
      }
    }
  }

  if (!operator) {
    // default
    operator = '=';
  }

  return `${not ? `NOT ` : ''}${field} ${operator} ${val}`;
}

function isCondition(arg: any): arg is ConditionParams {
  return arg.field !== undefined;
}

function isSubQueryCondition(arg: any): arg is SubQueryConditionParams {
  return arg.subqry !== undefined;
}

function isDateCondition(arg: any): arg is DateConditionParams {
  return arg.val instanceof Date;
}
