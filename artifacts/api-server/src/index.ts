import app from "./app.js";
import { logger } from "./lib/logger.js";
import { connectMongo } from "./lib/mongo.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

if (!process.env["MONGODB_URI"]) {
  logger.error("MONGODB_URI is not set — exiting");
  process.exit(1);
}

if (!process.env["JWT_SECRET"]) {
  logger.error("JWT_SECRET is not set — exiting");
  process.exit(1);
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await connectMongo();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
