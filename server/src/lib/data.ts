import { and, eq, inArray, sql } from "drizzle-orm";
import { messageTable, replicacheClientTable, type Transaction } from "../db";
import { conversationTable, replicacheClientGroupTable } from "../db";

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
): Promise<Omit<typeof replicacheClientTable.$inferSelect, "lastModified">> {
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

	return rows;
}

export async function searchMessages(
	tx: Transaction,
	accessibleByUserID: string,
) {
	const conversations = tx
		.select({
			id: conversationTable.id,
			xmin: sql<number>`conversation.xmin as "rowVersion"`,
		})
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
): Promise<Omit<typeof conversationTable.$inferSelect, "lastModified">[]> {
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
): Promise<Omit<typeof messageTable.$inferSelect, "lastModified">[]> {
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
