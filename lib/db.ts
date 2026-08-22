import { Pool } from "pg";
import { getEnv } from "@/lib/env";

declare global {
  var koraPool: Pool | undefined;
}

export function getPool() {
  if (!global.koraPool) {
    const env = getEnv();
    const isLocal =
      env.POSTGRES_URL.includes("localhost") ||
      env.POSTGRES_URL.includes("127.0.0.1");

    global.koraPool = new Pool({
      connectionString: env.POSTGRES_URL,
      ssl: isLocal ? false : true
    });
  }
  return global.koraPool;
}
