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

export const dictionary = pgTable("dictionary", {
	id: text("id").primaryKey(),
	name: text("name"),
	date: text("date"),
	version: integer("version"),
	description: text("description"),
});

export const word = pgTable("word", {
	id: text("id").primaryKey(),
	dictionaryId: text("dictionary_id"),
	word: text("word"),
	length: integer("length"),
	playability: integer("playability"),
});
