import type { Config } from "jest";

const config: Config = {
  runner: "@kayahr/jest-electron-runner/main",
  testPathIgnorePatterns: ["<rootDir>/test/fixtures"],
  coveragePathIgnorePatterns: ["<rootDir>/test/", "<rootDir>/dist/"],
  testEnvironment: "node",
  verbose: true,
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
};
export default config;
