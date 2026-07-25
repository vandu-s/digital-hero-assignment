/**
 * Global test setup, loaded once before any test file (see vite.config.ts
 * `test.setupFiles`). Registers jest-dom matchers like toBeInTheDocument()
 * and clears the DOM between tests.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
