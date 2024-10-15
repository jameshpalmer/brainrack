import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import {
	type PostgresJsQueryResultHKT,
	drizzle,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const { replicacheServerTable, replicacheClientTable, messageTable } =
	schema;

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is required");
}

export const serverId = 1;

export function transaction<T>(
	callback: (tx: Transaction) => Promise<T>,
): Promise<T> {
	return db.transaction(callback, { isolationLevel: "repeatable read" });
}

export const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client);

export type Transaction = PgTransaction<
	PostgresJsQueryResultHKT,
	Record<string, never>,
	ExtractTablesWithRelations<Record<string, never>>
>;
