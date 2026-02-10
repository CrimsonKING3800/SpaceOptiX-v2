import { MongoClient, type Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

let cached: { client: MongoClient; db: Db } | null = null;

export async function connectToDatabase(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  if (cached) {
    return cached;
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();

  cached = { client, db };
  return cached;
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}
