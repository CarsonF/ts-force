const fs = require('fs');
const { parse } = require('json5');
const { pathsToModuleNameMapper } = require('ts-jest/utils');

const { compilerOptions } = parse(fs.readFileSync('./tsconfig.json'));

module.exports = {
  preset: 'ts-jest',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  globals: {
    'ts-jest': {
      packageJson: 'package.json',
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  roots: ['<rootDir>packages'],
  setupFiles: [
    "dotenv/config"
  ],
  clearMocks: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'clover'],
};
