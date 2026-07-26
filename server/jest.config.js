/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  clearMocks: true,
  // Loads server/.env by absolute path so the suite works from any cwd
  // (repo root, server/, CI, IDE runner). See tests/setupEnv.ts.
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
};
