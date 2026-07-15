import { QUEUES, connectQueue, renderJobSchema } from "@diffchroma/shared";
import { failBuild, renderBuild } from "./render.js";

async function main() {
  const queue = await connectQueue();
  console.log("[render] worker started, waiting for jobs");
  await queue.consume(
    QUEUES.render,
    async (message) => {
      const job = renderJobSchema.parse(message);
      await renderBuild(job.buildId, queue);
    },
    {
      prefetch: 1,
      onError: async (message, error) => {
        const job = renderJobSchema.safeParse(message);
        if (job.success) await failBuild(job.data.buildId, error);
      },
    },
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
