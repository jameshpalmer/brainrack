import type { ReadTransaction } from "replicache";
import type { Message } from "shared/src/schema";

export async function messagesByConversation(
	tx: ReadTransaction,
	conversationID: string,
) {
	const allMessages = await tx
		.scan<Message>({ prefix: "message/" })
		.entries()
		.toArray();

	return allMessages.filter(
		([, message]) => message.conversationID === conversationID,
	);
}
