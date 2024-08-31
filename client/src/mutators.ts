import type { WriteTransaction } from "replicache";
import type { MessageWithID } from "shared";

export const mutators = {
	async createMessage(
		tx: WriteTransaction,
		{ id, from, content, order }: MessageWithID,
	) {
		await tx.set(`message/${id}`, {
			from,
			content,
			order,
		});
	},
};
