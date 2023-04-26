export default {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
  testPathIgnorePatterns: ["vendor", "build", "built", "node_modules"],
  modulePathIgnorePatterns: [".state", "tmp"],
  transform: {
    "\\.[jt]sx?$": ["ts-jest", { useESM: true }],
  },
  moduleNameMapper: {
    "(.+)\\.js": "$1",
  },
  extensionsToTreatAsEsm: [".ts"],
};
