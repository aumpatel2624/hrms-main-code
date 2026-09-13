import Redis from "ioredis";

// Optional shared cache. Redis is deliberately fail-open: a developer can run
// the panel without Redis and callers still receive their MongoDB result.
let client = null;
let warned = false;

const warnOnce = (error) => {
  if (warned) return;
  warned = true;
  console.warn(`Redis cache unavailable; continuing without it (${error?.message ?? "connection failed"})`);
};

export const initializeCache = () => {
  if (client || !process.env.REDIS_URL) return;
  client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 1000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
  });
  client.on("error", warnOnce);
  client.connect().catch(warnOnce);
};

/** Read a JSON value from Redis, or compute it directly when Redis misses/unavailable. */
export const getOrSet = async (key, ttlSeconds, fn) => {
  if (!client || client.status !== "ready") return fn();
  try {
    const cached = await client.get(key);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    warnOnce(error);
  }
  const value = await fn();
  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    warnOnce(error);
  }
  return value;
};

export const deleteCache = async (key) => {
  if (!client || client.status !== "ready") return;
  try {
    await client.del(key);
  } catch (error) {
    warnOnce(error);
  }
};

/** Delete a small named cache family without Redis KEYS blocking production. */
export const deleteCacheByPrefix = async (prefix) => {
  if (!client || client.status !== "ready") return;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await client.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length) await client.del(keys);
    } while (cursor !== "0");
  } catch (error) {
    warnOnce(error);
  }
};
