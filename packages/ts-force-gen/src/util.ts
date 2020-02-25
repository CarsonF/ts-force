import * as fs from 'fs';
import { Project, SourceFile } from 'ts-morph';

const API_NAME_REGEX = /(?:^((?:\w(?!__))+\w)__|^)((?:\w(?!__))+\w)(?:__(.+)$|$)/;

export const cleanAPIName = (sfName: string, stripNamespace: boolean) => {
  const match = API_NAME_REGEX.exec(sfName);
  if (!match) {
    throw new Error('NO MATCH FOUND FOR ' + sfName);
  }
  const name = (!stripNamespace && match[1] ? match[1] : '') + match[2];
  return name.replace(/_/g, '');
};

export const replaceSource = (path: string): SourceFile => {
  try {
    fs.unlinkSync(path);
  } catch (e) {
    // silently fail
  }
  const ast = new Project();
  return ast.createSourceFile(path);
};
