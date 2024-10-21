import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
	alphagramTable,
	messageTable,
	replicacheClientTable,
	replicacheClientGroupTable,
	conversationTable,
	wordGroupTable,
	wordTable,
	type Transaction,
} from "../db";
import type {
	Alphagram,
	Conversation,
	Message,
	ReplicacheClient,
	Word,
	WordGroup,
} from "shared";

export type SearchResult = {
	id: string;
	rowVersion: number;
};

export type Affected = {
	conversationIDs: string[];
	userIDs: string[];
};

export async function getClientGroup(
	tx: Transaction,
	clientGroupID: string,
	userID: string,
) {
	const rows = await tx
		.select({
			userID: replicacheClientGroupTable.userID,
			cvrversion: replicacheClientGroupTable.cvrVersion,
		})
		.from(replicacheClientGroupTable)
		.where(eq(replicacheClientGroupTable.id, clientGroupID));

	if (!rows || rows.length === 0) {
		return {
			id: clientGroupID,
			userID,
			cvrVersion: 0,
		};
	}

	const r = rows[0];
	if (r.userID !== userID) {
		throw new Error("Authorization error - user does not own client group");
	}
	return {
		id: clientGroupID,
		userID: r.userID,
		cvrVersion: r.cvrversion,
	};
}

export async function getClient(
	tx: Transaction,
	clientID: string,
	clientGroupID: string,
): Promise<ReplicacheClient> {
	const rows = await tx
		.select({
			id: replicacheClientTable.id,
			clientGroupID: replicacheClientTable.clientGroupID,
			lastMutationID: replicacheClientTable.lastMutationID,
		})
		.from(replicacheClientTable)
		.where(eq(replicacheClientTable.id, clientID));

	if (!rows || rows.length === 0)
		return {
			id: clientID,
			clientGroupID: "",
			lastMutationID: 0,
		};
	const r = rows[0];
	if (r.clientGroupID !== clientGroupID) {
		throw new Error(
			"Authorization error - client does not belong to client group",
		);
	}

	return {
		id: r.id,
		clientGroupID: r.clientGroupID,
		lastMutationID: r.lastMutationID,
	};
}

export async function seachWordGroups(tx: Transaction) {
	const wordGroups = tx
		.select({
			id: wordGroupTable.id,
			length: wordGroupTable.length,
			rowVersion: sql<number>`word_group.xmin`.as("rowVersion"),
			rowNumber:
				sql<number>`row_number() over(partition by word_group.length order by word_group.last_modified desc)`.as(
					"rowNumber",
				),
		})
		.from(wordGroupTable)
		.orderBy(desc(wordGroupTable.lastModified))
		.as("wordGroups");

	const rows = await tx
		.select({
			id: wordGroups.id,
			rowVersion: wordGroups.rowVersion,
		})
		.from(wordGroups)
		.where(eq(wordGroups.rowNumber, 1));

	return rows as SearchResult[];
}

export async function searchConversations(
	tx: Transaction,
	accessibleByUserID: string,
) {
	const rows = await tx
		.select({
			id: conversationTable.id,
			rowVersion: sql<number>`conversation.xmin as "rowVersion"`,
		})
		.from(conversationTable)
		.where(eq(conversationTable.ownerUserID, accessibleByUserID));

	return rows as SearchResult[];
}

export async function searchMessages(
	tx: Transaction,
	accessibleByUserID: string,
) {
	const conversations = tx
		.select({ id: conversationTable.id })
		.from(conversationTable)
		.where(eq(conversationTable.ownerUserID, accessibleByUserID))
		.as("conversations");

	const rows = await tx
		.select({
			id: messageTable.id,
			rowVersion: sql<number>`message.xmin as "rowVersion"`,
		})
		.from(messageTable)
		.innerJoin(
			conversations,
			eq(messageTable.conversationID, conversations.id),
		);

	return rows as SearchResult[];
}

export async function searchClients(tx: Transaction, clientGroupID: string) {
	const rows = await tx
		.select({
			id: replicacheClientTable.id,
			rowVersion: replicacheClientTable.lastMutationID,
		})
		.from(replicacheClientTable)
		.where(eq(replicacheClientTable.clientGroupID, clientGroupID));

	return rows as SearchResult[];
}

export async function getConversations(
	tx: Transaction,
	conversationIDs: string[],
): Promise<Conversation[]> {
	const conversations = await tx
		.select({
			id: conversationTable.id,
			ownerUserID: conversationTable.ownerUserID,
		})
		.from(conversationTable)
		.where(inArray(conversationTable.id, conversationIDs));

	return conversations;
}

export async function getMessages(
	tx: Transaction,
	messageIDs: string[],
): Promise<Message[]> {
	const messages = await tx
		.select({
			id: messageTable.id,
			conversationID: messageTable.conversationID,
			sender: messageTable.sender,
			content: messageTable.content,
			ord: messageTable.ord,
		})
		.from(messageTable)
		.where(inArray(messageTable.id, messageIDs));

	return messages;
}

export async function getDictionary(
	tx: Transaction,
	wordGroupIDs: string[],
): Promise<{ wordGroup: WordGroup; alphagrams: Alphagram[]; words: Word[] }[]> {
	const queries: Promise<[WordGroup[], Alphagram[], Word[]]>[] = [];
	for (const wordGroupID of wordGroupIDs) {
		console.log("wordGroupID", wordGroupID);
		const wordGroups = tx
			.select({
				id: wordGroupTable.id,
				length: wordGroupTable.length,
			})
			.from(wordGroupTable)
			.where(eq(wordGroupTable.id, wordGroupID));

		const alphagrams: Promise<Alphagram[]> = tx
			.select({
				a: alphagramTable.alphagram,
				ws: sql<string[]>`array_agg(word.word) as "ws"`,
				cs: alphagramTable.cswWords,
				ns: alphagramTable.nwlWords,
			})
			.from(alphagramTable)
			.innerJoin(wordTable, eq(alphagramTable.id, wordTable.alphagramID))
			.where(eq(alphagramTable.wordGroupID, wordGroupID))
			.groupBy(alphagramTable.id);

		const words: Promise<Word[]> = tx
			.select({
				w: wordTable.word,
				a: alphagramTable.alphagram,
				d: wordTable.definition,
				cv: wordTable.cswValid,
				nv: wordTable.nwlValid,
				p: wordTable.playability,
			})
			.from(wordTable)
			.innerJoin(alphagramTable, eq(alphagramTable.id, wordTable.alphagramID))
			.where(eq(alphagramTable.wordGroupID, wordGroupID))
			.orderBy(wordTable.word);

		queries.push(Promise.all([wordGroups, alphagrams, words]));
	}

	const results = await Promise.all(queries);

	return results.map(([wordGroup, alphagrams, words]) => ({
		wordGroup: wordGroup[0],
		alphagrams,
		words,
	}));
}

export async function putClientGroup(
	tx: Transaction,
	clientGroup: typeof replicacheClientGroupTable.$inferInsert,
) {
	await tx
		.insert(replicacheClientGroupTable)
		.values(clientGroup)
		.onConflictDoUpdate({
			target: replicacheClientGroupTable.id,
			set: {
				userID: clientGroup.userID,
				cvrVersion: clientGroup.cvrVersion,
				lastModified: sql`NOW()`,
			},
		});
}

export async function putClient(
	tx: Transaction,
	client: typeof replicacheClientTable.$inferInsert,
) {
	const { id, clientGroupID, lastMutationID } = client;

	await tx
		.insert(replicacheClientTable)
		.values({
			id,
			clientGroupID,
			lastMutationID,
			lastModified: sql`NOW()`,
		})
		.onConflictDoUpdate({
			target: replicacheClientTable.id,
			set: {
				lastMutationID,
				lastModified: sql`NOW()`,
			},
		});
}

export async function createConversation(
	tx: Transaction,
	userID: string,
	conversation: typeof conversationTable.$inferInsert,
): Promise<Affected> {
	// users can only create conversations for themselves
	if (conversation.ownerUserID !== userID) {
		throw new Error(
			"Authorization error - user can only create conversations for themselves",
		);
	}

	await tx.insert(conversationTable).values(conversation);

	return { conversationIDs: [], userIDs: [conversation.ownerUserID] };
}

export async function createMessage(
	tx: Transaction,
	userID: string,
	message: typeof messageTable.$inferInsert,
) {
	const userCanAccessConversation = await tx
		.select({
			id: conversationTable.id,
		})
		.from(conversationTable)
		.where(
			and(
				eq(conversationTable.ownerUserID, userID),
				eq(conversationTable.id, message.conversationID),
			),
		);

	if (userCanAccessConversation.length === 0) {
		throw new Error("Authorization error - user cannot access conversation");
	}

	await tx.insert(messageTable).values(message);

	return { conversationIDs: [message.conversationID], userIDs: [] };
}

export async function deleteMessage(
	tx: Transaction,
	userID: string,
	messageID: string,
) {
	// users can only delete messages they own
	const userConversations = tx
		.select({
			id: conversationTable.id,
		})
		.from(conversationTable)
		.where(eq(conversationTable.ownerUserID, userID))
		.as("userConversations");

	const message = await tx
		.select({
			conversationID: messageTable.conversationID,
		})
		.from(messageTable)
		.innerJoin(
			userConversations,
			eq(messageTable.conversationID, userConversations.id),
		)
		.where(eq(messageTable.id, messageID));

	if (message.length === 0) {
		throw new Error("Message not found");
	}

	await tx.delete(messageTable).where(eq(messageTable.id, messageID));

	return { conversationIDs: [message[0].conversationID], userIDs: [] };
}
