import { pgTable, integer, text, varchar, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const replicacheServer = pgTable("replicache_server", {
	id: integer("id").primaryKey().notNull(),
	version: integer("version"),
});

export const message = pgTable("message", {
	id: text("id").primaryKey().notNull(),
	sender: varchar("sender", { length: 255 }).notNull(),
	content: text("content").notNull(),
	ord: integer("ord").notNull(),
	deleted: boolean("deleted").notNull(),
	version: integer("version").notNull(),
});

export const replicacheClient = pgTable("replicache_client", {
	id: varchar("id", { length: 36 }).primaryKey().notNull(),
	clientGroupId: varchar("client_group_id", { length: 36 }).notNull(),
	lastMutationId: integer("last_mutation_id").notNull(),
	version: integer("version").notNull(),
});

export const alphagram = pgTable("alphagram", {
	id: text("id").primaryKey().notNull(),
	alphagram: text("alphagram").notNull(),
	length: integer("length").notNull(),
	cswWords: integer("csw_words").notNull(),
	nwlWords: integer("nwl_words").notNull(),
});

export const word = pgTable("word", {
	id: text("id").primaryKey().notNull(),
	word: text("word").notNull(),
	cswValid: boolean("csw_valid").notNull(),
	nwlValid: boolean("nwl_valid").notNull(),
	playability: integer("playability").notNull(),
	alphagramId: text("alphagram_id").notNull(),
	definition: text("definition"),
});
