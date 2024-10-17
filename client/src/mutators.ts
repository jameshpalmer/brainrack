import type { WriteTransaction } from "replicache";
import type { Conversation, Message } from "shared";

export const mutators = {
	async createConversation(
		tx: WriteTransaction,
		{ id, ...conversation }: Conversation,
	) {
		tx.set(`conversation/${id}`, conversation);
	},
	async createMessage(tx: WriteTransaction, { id, ...message }: Message) {
		await tx.set(`message/${id}`, message);
	},
	async deleteMessage(tx: WriteTransaction, id: string) {
		tx.del(`message/${id}`);
	},
};
