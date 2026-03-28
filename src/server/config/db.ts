import mongoose from "mongoose";

import { env } from "./env";

declare global {
  var mongooseConnection:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

export async function connectDatabase() {
  const cached = global.mongooseConnection ?? { conn: null, promise: null };

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(env.mongoUri);
  }

  cached.conn = await cached.promise;
  global.mongooseConnection = cached;

  return cached.conn;
}
