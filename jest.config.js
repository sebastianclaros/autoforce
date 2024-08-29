/** @returns {Promise<import('jest').Config>} */

module.exports = {
  //  preset: "ts-jest",
  //    testEnvironment: "node",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(t|j)s$",
  moduleFileExtensions: ["ts", "js", "json", "node"],
};
