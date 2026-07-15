import { QUEUES, compareJobSchema, connectQueue } from "@diffchroma/shared";
import { compareBuild, failBuild } from "./compare.js";

async function main() {
  const queue = await connectQueue();
  console.log("[compare] worker started, waiting for jobs");
  await queue.consume(
    QUEUES.compare,
    async (message) => {
      const job = compareJobSchema.parse(message);
      await compareBuild(job.buildId);
    },
    {
      prefetch: 1,
      onError: async (message, error) => {
        const job = compareJobSchema.safeParse(message);
        if (job.success) await failBuild(job.data.buildId, error);
      },
    },
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
