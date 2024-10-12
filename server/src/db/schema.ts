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

export const alphagram = pgTable("alphagram", {
	id: text("id").primaryKey(),
	alphagram: text("alphagram").notNull(),
	length: integer("length").notNull(),
	cswWords: integer("csw_words").notNull(),
	nwlWords: integer("nwl_words").notNull(),
});

export const word = pgTable("word", {
	id: text("id").primaryKey(),
	word: text("word").notNull(),
	definition: text("definition"),
	cswValid: boolean("csw_valid").notNull(),
	nwlValid: boolean("nwl_valid").notNull(),
	playability: integer("playability").notNull(),
	alphagramId: text("alphagram_id").notNull(),
});
