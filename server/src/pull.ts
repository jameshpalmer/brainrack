import { and, eq, gt, isNotNull } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import type { PatchOperation, PullResponse } from "replicache";
import {
	type Transaction,
	message,
	replicacheClient,
	replicacheServer,
	serverId,
	transaction,
} from "./db";

export async function handlePull(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const resp = await pull(req, res);
		res.json(resp);
	} catch (e) {
		next(e);
	}
}

async function pull(req: Request, res: Response) {
	const pull = req.body;
	console.log("Processing pull", JSON.stringify(pull));
	const { clientGroupID } = pull;
	const clientVersion = pull.cookie ?? 0;
	const t0 = Date.now();

	try {
		// Read all data in a single transaction so it's consistent
		await transaction(async (tx) => {
			const serverVersion = await tx
				.select({ version: replicacheServer.version })
				.from(replicacheServer)
				.where(eq(replicacheServer.id, serverId))
				.then((r) => r[0]?.version ?? 0);

			if (clientVersion > serverVersion) {
				throw new Error(
					`clientVersion ${clientVersion} is from the future (serverVersion: ${serverVersion}) - aborting.`,
				);
			}

			const lastMutationIDChanges = await getLastMutationIDChanges(
				tx,
				clientGroupID,
				clientVersion,
			);

			const changed = await tx
				.select({
					id: message.id,
					sender: message.sender,
					content: message.content,
					ord: message.ord,
					version: message.version,
					deleted: message.deleted,
				})
				.from(message)
				.where(gt(message.version, clientVersion));

			const patch: PatchOperation[] = [];
			for (const row of changed) {
				const { id, sender, content, ord, version: rowVersion, deleted } = row;
				if (deleted) {
					if (rowVersion !== null && rowVersion > clientVersion) {
						patch.push({
							op: "del",
							key: `message/${id}`,
						});
					}
				} else {
					patch.push({
						op: "put",
						key: `message/${id}`,
						value: {
							from: sender,
							content,
							order: ord,
						},
					});
				}
			}

			const body: PullResponse = {
				lastMutationIDChanges: lastMutationIDChanges ?? {},
				cookie: serverVersion,
				patch,
			};

			res.json(body);
		});
	} catch (e) {
		console.error(e);
		res.status(500).send(e);
	} finally {
		console.log("Processed pull in", Date.now() - t0);
	}
}

async function getLastMutationIDChanges(
	tx: Transaction,
	clientGroupID: string,
	clientVersion: number,
) {
	const rows = (await tx
		.select({
			id: replicacheClient.id,
			lastMutationID: replicacheClient.lastMutationID,
		})
		.from(replicacheClient)
		.where(
			and(
				eq(replicacheClient.clientGroupID, clientGroupID),
				gt(replicacheClient.version, clientVersion),
				isNotNull(replicacheClient.lastMutationID),
			),
		)) as { id: string; lastMutationID: number }[];

	return Object.fromEntries(rows.map((r) => [r.id, r.lastMutationID]));
}
