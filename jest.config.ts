export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/test.*.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  //coverageDirectory: './coverage',
  //reporters: ['default', 'jest-junit'],
  //coveragePathIgnorePatterns: ['node_modules'],
  globals: { 'ts-jest': { diagnostics: false } },
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  moduleFileExtensions: ["js", "ts", "json", "node"],
};
