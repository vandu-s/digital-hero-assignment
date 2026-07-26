/**
 * Loads server/.env with an absolute path before any test module is imported.
 *
 * Why this exists: src/config/env.ts uses `import "dotenv/config"`, which
 * resolves `.env` relative to the *process* cwd. That works when jest is run
 * from inside server/, but fails when it is run from the repo root (or by a
 * CI job / IDE runner with a different cwd) - env validation then throws
 * "Invalid environment variables" and every suite fails to load.
 *
 * Pointing dotenv at a path derived from __dirname makes the suite
 * cwd-independent. `override: false` keeps real environment variables
 * authoritative, so CI can inject its own DATABASE_URL without .env winning.
 */
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "..", ".env"), override: false });
