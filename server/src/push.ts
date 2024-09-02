import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import type { MutationV1, PushRequestV1 } from "replicache";
import type { MessageWithID } from "shared";
import {
	type Transaction,
	db,
	message,
	replicacheClient,
	replicacheServer,
	serverId,
} from "./db";
import { getPokeBackend } from "./poke";

export async function handlePush(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		await push(req, res);
	} catch (e) {
		next(e);
	}
}

async function push(req: Request, res: Response) {
	const push: PushRequestV1 = req.body;
	console.log(req.body);
	console.log("Processing push", JSON.stringify(push));

	const t0 = Date.now();
	try {
		// Iterate each mutation in the push.
		for (const mutation of push.mutations) {
			const t1 = Date.now();

			try {
				await db.transaction(async (tx) =>
					processMutation(tx, push.clientGroupID, mutation),
				);
			} catch (e) {
				console.error("Caught error from mutation", mutation, e);

				// Handle errors inside mutations by skipping and moving on. This is
				// convenient in development but you may want to reconsider as your app
				// gets close to production:
				// https://doc.replicache.dev/reference/server-push#error-handling
				await db.transaction(async (tx) =>
					processMutation(tx, push.clientGroupID, mutation, e as string),
				);
			}

			console.log("Processed mutation in", Date.now() - t1);
		}

		const pokeBackend = getPokeBackend();
		pokeBackend.poke("1");

		res.send("{}");
	} catch (e) {
		console.error(e);
		res.status(500).send(e);
	} finally {
		console.log("Processed push in", Date.now() - t0);
	}
}

async function processMutation(
	tx: Transaction,
	clientGroupID: string,
	mutation: MutationV1,
	error?: string | undefined,
) {
	const { clientID } = mutation;

	const prevVersion = await tx
		.select({
			version: replicacheServer.version,
		})
		.from(replicacheServer)
		.where(eq(replicacheServer.id, serverId))
		.then((rows) => rows[0]?.version ?? 0);

	const nextVersion = prevVersion + 1;

	const lastMutationID = await getLastMutationId(tx, clientID);
	const nextMutationID = lastMutationID + 1;

	console.log("nextVersion", nextVersion, "nextMutationID", nextMutationID);

	// It's common due to connectivity issues for clients to send a
	// mutation which has already been processed. Skip these.
	if (mutation.id < nextMutationID) {
		console.log(
			`Mutation ${mutation.id} has already been processed - skipping`,
		);
		return;
	}

	// If the Replicache client is working correctly, this can never happen
	if (mutation.id > nextMutationID) {
		throw new Error(
			`Mutation ${mutation.id} is from the future (current: ${nextMutationID}) - aborting.`,
		);
	}

	if (error === undefined) {
		console.log("Processing mutation:", JSON.stringify(mutation));

		switch (mutation.name) {
			case "createMessage":
				await createMessage(tx, mutation.args as MessageWithID, nextVersion);
				break;
			default:
				throw new Error(`Unknown mutation: ${mutation.name}`);
		}
	} else {
		// TODO: You can store state here in the database to return to clients to
		// provide additional info about errors
		console.log(
			"Handling error from mutation",
			JSON.stringify(mutation),
			error,
		);
	}

	console.log("setting", clientID, "last_mutation_id to", nextMutationID);
	await setLastMutationId(
		tx,
		clientID,
		clientGroupID,
		nextMutationID,
		nextVersion,
	);

	await tx
		.update(replicacheServer)
		.set({ version: nextVersion })
		.where(eq(replicacheServer.id, serverId));
}

export async function getLastMutationId(tx: Transaction, clientID: string) {
	const clientRow = await tx
		.select({
			lastMutationID: replicacheClient.lastMutationID,
		})
		.from(replicacheClient)
		.where(eq(replicacheClient.id, clientID))
		.then((rows) => rows[0]);

	if (!clientRow) {
		return 0;
	}

	return clientRow.lastMutationID ? clientRow.lastMutationID : 0;
}

async function setLastMutationId(
	tx: Transaction,
	clientID: string,
	clientGroupID: string,
	lastMutationID: number,
	version: number,
) {
	const result = await tx
		.update(replicacheClient)
		.set({
			clientGroupID,
			lastMutationID,
			version,
		})
		.where(eq(replicacheClient.id, clientID))
		.returning();

	if (result.length === 0) {
		await tx.insert(replicacheClient).values({
			id: clientID,
			clientGroupID,
			lastMutationID,
			version,
		});
	}
}

async function createMessage(
	tx: Transaction,
	{ id, from, content, order }: MessageWithID,
	version: number,
) {
	await tx.insert(message).values({
		id,
		sender: from,
		content,
		ord: order,
		deleted: false,
		version,
	});
}
