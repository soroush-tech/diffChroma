import { config, connectQueue } from "@diffchroma/shared";
import { buildApp } from "./app.js";

async function main() {
  const queue = await connectQueue();
  const app = await buildApp(queue);
  await app.listen({ port: config.API_PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
