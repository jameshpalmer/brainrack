import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

export const replicacheServer = pgTable("replicache_server", {
	id: integer("id").primaryKey(),
	version: integer("version"),
});

export const replicacheClient = pgTable("replicache_client", {
	id: text("id").primaryKey(),
	clientGroupID: text("client_group_id"),
	lastMutationID: integer("last_mutation_id"),
	version: integer("version"),
});

export const message = pgTable("message", {
	id: text("id").primaryKey(),
	sender: text("sender"),
	content: text("content"),
	ord: integer("ord"),
	deleted: boolean("deleted"),
	version: integer("version"),
});
