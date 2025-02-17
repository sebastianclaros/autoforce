/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/test.*.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  //coverageDirectory: './coverage',
  //reporters: ['default', 'jest-junit'],
  //coveragePathIgnorePatterns: ['node_modules'],
  // Deprecated globals: { 'ts-jest': { diagnostics: false } },
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest",  { astTransformers: {
      before: [
        {
          path: 'node_modules/ts-jest-mock-import-meta',  // or, alternatively, 'ts-jest-mock-import-meta' directly, without node_modules.
          options: {
              metaObjectReplacement: {
                url: ({ fileName }) => `file://${fileName}`,
                file: ({ fileName }) => fileName
              }
            }
        }
      ]
    }
  }
],
  },
  moduleFileExtensions: ["js", "ts", "json", "node"],
};