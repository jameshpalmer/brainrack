import dotenv from "dotenv";
import pgp, { type IDatabase, type ITask } from "pg-promise";

dotenv.config();

const { isolationLevel } = pgp.txMode;

export const serverID = 1;

const globalWithDB = global as typeof global & {
	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	__db?: Promise<IDatabase<{}>>;
};

const dbConfig = process.env.DATABASE_URL;

if (!dbConfig) {
	throw new Error("DATABASE_URL environment variable is required");
}

const pgpInstance = pgp();
const db = pgpInstance(dbConfig);

async function initDB() {
	console.log("initializing database...");
	await tx(async (t) => {
		await t.none(
			"create table if not exists replicache_server (id integer primary key not null, version integer)",
		);
		await t.none(
			"insert into replicache_server (id, version) values ($1, 1) on conflict (id) do nothing",
			serverID,
		);

		await t.none(`create table if not exists message (
        id text primary key not null,
        sender varchar(255) not null,
        content text not null,
        ord integer not null,
        deleted boolean not null,
        version integer not null)`);

		await t.none(`create table if not exists replicache_client (
        id varchar(36) primary key not null,
        client_group_id varchar(36) not null,
        last_mutation_id integer not null,
        version integer not null)`);
	}, Promise.resolve(db));
	return db;
}

function getDB() {
	if (!globalWithDB.__db) {
		globalWithDB.__db = initDB();
	}
	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	return globalWithDB.__db as Promise<IDatabase<{}>>;
}

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type Transaction = ITask<{}>;
type TransactionCallback<R> = (t: Transaction) => Promise<R>;

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
