import { Redis } from "ioredis";

const redisHost = process.env.REDIS_HOST ?? "localhost";
const redisPort = parseInt(process.env.REDIS_PORT ?? "6379", 10);

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  lazyConnect: true,
});

redis.on("error", (err) => {
  // Non-fatal — admin panel can still function without Redis
  console.warn("[Redis] Connection error:", err.message);
});
