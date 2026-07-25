/**
 * Boot entrypoint. Starts the HTTP server. Kept separate from app.ts so
 * tests can import the Express app without binding a real port.
 */
import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});
