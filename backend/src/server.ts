import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { app } from "./app";

async function start() {
  await connectDatabase();
  app.listen(env.port, () => {
    console.log(`LiveWell API listening on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
