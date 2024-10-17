import { z } from "zod";
import { createConversation, createMessage, deleteMessage } from "./data";
import { messageTable, type Transaction } from "../db";
import { createInsertSchema } from "drizzle-zod";
import { conversationTable } from "../db";

export const mutationSchema = z.object({
	id: z.number(),
	clientID: z.string(),
	name: z.enum(["createConversation", "createMessage", "deleteMessage"]),
	args: z.any(),
});

const insertConversationSchema = createInsertSchema(conversationTable);

const insertMessageSchema = createInsertSchema(messageTable);

export type Mutation = z.infer<typeof mutationSchema>;

export async function mutate(
	tx: Transaction,
	userID: string,
	mutation: Mutation,
) {
	switch (mutation.name) {
		case "createConversation":
			return await createConversation(
				tx,
				userID,
				insertConversationSchema
					.omit({ lastModified: true })
					.parse(mutation.args),
			);
		case "createMessage":
			return await createMessage(
				tx,
				userID,
				insertMessageSchema.omit({ lastModified: true }).parse(mutation.args),
			);
		case "deleteMessage":
			return await deleteMessage(tx, userID, z.string().parse(mutation.args));
		default:
			return {
				conversationIDs: [],
				userIDs: [],
			};
	}
}
