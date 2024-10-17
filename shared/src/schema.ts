import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const replicacheServerTable = pgTable("replicache_server", {
	id: integer("id").primaryKey(),
	version: integer("version"),
});

export const userTable = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name"),
	lastModified: timestamp("last_modified").defaultNow(),
});

// Omit lastModified because timestamps are not serializable (w/o string conversion)
export type User = Omit<typeof userTable.$inferSelect, "lastModified">;

export const replicacheClientGroupTable = pgTable("replicache_client_group", {
	id: text("id").primaryKey(),
	userID: text("user_id").references(() => userTable.id),
	// Cookie counter for this client group. Incremented on every pull.
	cvrVersion: integer("cvr_version").notNull(),
	lastModified: timestamp("last_modified").defaultNow(),
});

export const replicacheClientTable = pgTable("replicache_client", {
	id: text("id").primaryKey(),
	clientGroupID: text("client_group_id"),
	lastMutationID: integer("last_mutation_id").notNull().default(0),
	lastModified: timestamp("last_modified").defaultNow(),
});

export const conversationTable = pgTable("conversation", {
	id: text("id").primaryKey(),
	ownerUserID: text("owner_user_id").references(() => userTable.id),
	lastModified: timestamp("last_modified").defaultNow(),
});

export type Conversation = Omit<
	typeof conversationTable.$inferSelect,
	"lastModified"
>;

export const messageTable = pgTable("message", {
	id: text("id").primaryKey(),
	sender: text("sender"),
	content: text("content"),
	ord: integer("ord"),
	deleted: boolean("deleted"),
	conversationID: text("conversation_id")
		.notNull()
		.references(() => conversationTable.id),
	lastModified: timestamp("last_modified").defaultNow(),
});

export type Message = Omit<typeof messageTable.$inferSelect, "lastModified">;

export const alphagramTable = pgTable("alphagram", {
	id: text("id").primaryKey(),
	alphagram: text("alphagram").notNull(),
	length: integer("length").notNull(),
	cswWords: integer("csw_words").notNull(),
	nwlWords: integer("nwl_words").notNull(),
	lastModified: timestamp("last_modified").defaultNow(),
});

export const wordTable = pgTable("word", {
	id: text("id").primaryKey(),
	word: text("word").notNull(),
	definition: text("definition"),
	cswValid: boolean("csw_valid").notNull(),
	nwlValid: boolean("nwl_valid").notNull(),
	playability: integer("playability").notNull(),
	alphagramID: text("alphagram_id")
		.notNull()
		.references(() => alphagramTable.id),
	lastModified: timestamp("last_modified").defaultNow(),
});

export const gameTable = pgTable("game", {
	id: text("id").primaryKey(),
	lastModified: timestamp("last_modified").defaultNow(),
});
