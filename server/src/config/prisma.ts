/**
 * Single shared PrismaClient instance. Importing this file anywhere in the
 * app reuses the same client instead of opening a new connection pool per
 * import - important in dev with hot-reload, and for tests that import the
 * app repeatedly.
 */
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
