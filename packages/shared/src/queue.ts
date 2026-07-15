import amqplib, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import { config } from "./config.js";

export const EXCHANGE = "diffchroma";
export const DLX = "diffchroma.dlx";

export const QUEUES = {
  render: "render",
  compare: "compare",
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export interface QueueConnection {
  channel: Channel;
  publish(queue: QueueName, message: unknown): void;
  consume<T>(
    queue: QueueName,
    handler: (message: T, raw: ConsumeMessage) => Promise<void>,
    options?: {
      prefetch?: number;
      /** Called when the handler throws; the message is dead-lettered afterwards. */
      onError?: (message: T | undefined, error: unknown) => Promise<void>;
    },
  ): Promise<void>;
  close(): Promise<void>;
}

async function assertTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(EXCHANGE, "direct", { durable: true });
  await channel.assertExchange(DLX, "direct", { durable: true });
  for (const queue of Object.values(QUEUES)) {
    await channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: DLX,
      deadLetterRoutingKey: queue,
    });
    await channel.bindQueue(queue, EXCHANGE, queue);
    await channel.assertQueue(`${queue}.dlq`, { durable: true });
    await channel.bindQueue(`${queue}.dlq`, DLX, queue);
  }
}

export async function connectQueue(url: string = config.AMQP_URL): Promise<QueueConnection> {
  const connection: ChannelModel = await amqplib.connect(url);
  const channel = await connection.createChannel();
  await assertTopology(channel);

  connection.on("error", (err) => {
    console.error("[queue] connection error:", err);
  });
  connection.on("close", () => {
    // Long-running workers rely on their supervisor (docker restart policy /
    // dev watcher) to bring them back with a fresh connection.
    console.error("[queue] connection closed");
    process.exitCode = 1;
  });

  return {
    channel,
    publish(queue, message) {
      channel.publish(EXCHANGE, queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: "application/json",
      });
    },
    async consume(queue, handler, options = {}) {
      await channel.prefetch(options.prefetch ?? 1);
      await channel.consume(queue, async (raw) => {
        if (!raw) return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.content.toString("utf8"));
          await handler(parsed as never, raw);
          channel.ack(raw);
        } catch (err) {
          console.error(`[queue] handler failed for ${queue}:`, err);
          try {
            await options.onError?.(parsed as never, err);
          } catch (hookErr) {
            console.error("[queue] onError hook failed:", hookErr);
          }
          channel.nack(raw, false, false); // dead-letter, don't requeue
        }
      });
    },
    async close() {
      await channel.close();
      await connection.close();
    },
  };
}
