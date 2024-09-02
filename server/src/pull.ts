import { and, eq, gt, isNotNull } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import type { PatchOperation, PullResponse } from "replicache";
import {
	type Transaction,
	db,
	message,
	replicacheClient,
	replicacheServer,
	serverId,
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
	const fromVersion = pull.cookie ?? 0;
	const t0 = Date.now();

	try {
		// Read all data in a single transaction so it's consistent
		await db.transaction(
			async (tx) => {
				const currentVersion = await tx
					.select({ version: replicacheServer.version })
					.from(replicacheServer)
					.where(eq(replicacheServer.id, serverId))
					.then((r) => r[0]?.version ?? 0);

				if (fromVersion > currentVersion) {
					throw new Error(
						`fromVersion ${fromVersion} is from the future (currentVersion: ${currentVersion}) - aborting.`,
					);
				}

				const lastMutationIDChanges = await getLastMutationIDChanges(
					tx,
					clientGroupID,
					fromVersion,
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
					.where(gt(message.version, fromVersion));

				const patch: PatchOperation[] = [];
				for (const row of changed) {
					const {
						id,
						sender,
						content,
						ord,
						version: rowVersion,
						deleted,
					} = row;
					if (deleted) {
						if (rowVersion !== null && rowVersion > fromVersion) {
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
					cookie: currentVersion,
					patch,
				};

				res.json(body);
			},
			{ isolationLevel: "repeatable read" },
		);
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
	fromVersion: number,
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
				gt(replicacheClient.version, fromVersion),
				isNotNull(replicacheClient.lastMutationID),
			),
		)) as { id: string; lastMutationID: number }[];

	return Object.fromEntries(rows.map((r) => [r.id, r.lastMutationID]));
}
