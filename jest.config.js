/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  collectCoverageFrom: [
    "src/lib/auth/**/*.ts",
    "src/lib/characters/**/*.ts",
    "src/lib/chat/**/*.ts",
    "src/lib/db/repositories.ts",
    "src/lib/speech/**/*.ts",
    "src/lib/stats/**/*.ts",
    "!src/**/*.test.ts"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "html"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy"
  },
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx"
        }
      }
    ]
  }
};

module.exports = config;
