export const NULL = 'NULL';

export const stringFormatter = (val: string) => `'${val}'`;

export const dateFormatter = (val: Date) => val.toISOString().slice(0, 10);

export const dateTimeFormatter = (val: Date) => val.toISOString();

export const listFormatter = (val: string[]) =>
  `(${val.map(v => `'${v}'`).join(', ')})`;
