import { newDb } from "pg-mem";
import pgp, { type IDatabase, type ITask } from "pg-promise";

const { isolationLevel } = pgp.txMode;

export const serverID = 1;

const globalWithDB = global as typeof global & {
	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	__db?: Promise<IDatabase<{}>>;
};

async function initDB() {
	console.log("initializing database...");
	const db = newDb().adapters.createPgPromise();
	await tx(async (t) => {
		// A single global version number for the entire database.
		await t.none(
			"create table replicache_server (id integer primary key not null, version integer)",
		);
		await t.none(
			"insert into replicache_server (id, version) values ($1, 1)",
			serverID,
		);

		// Stores chat messages.
		await t.none(`create table message (
        id text primary key not null,
        sender varchar(255) not null,
        content text not null,
        ord integer not null,
        deleted boolean not null,
        version integer not null)`);

		// Stores last mutationID processed for each Replicache client.
		await t.none(`create table replicache_client (
        id varchar(36) primary key not null,
        client_group_id varchar(36) not null,
        last_mutation_id integer not null,
        version integer not null)`);

		// TODO: indexes
	}, db);
	return db;
}

function getDB() {
	// Cache the database in the Node global so that it survives HMR.
	if (!globalWithDB.__db) {
		globalWithDB.__db = initDB();
	}
	// biome-ignore lint/complexity/noBannedTypes:
	return globalWithDB.__db as Promise<IDatabase<{}>>;
}

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type Transaction = ITask<{}>;
type TransactionCallback<R> = (t: Transaction) => Promise<R>;

// In Postgres, snapshot isolation is known as "repeatable read".
export async function tx<R>(f: TransactionCallback<R>, dbp = getDB()) {
	const db = await dbp;
	return await db.tx(
		{
			mode: new pgp.txMode.TransactionMode({
				tiLevel: isolationLevel.repeatableRead,
			}),
		},
		f,
	);
}
