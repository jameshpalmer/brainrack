import type { NextFunction, Request, Response } from "express";
import type { ReadonlyJSONValue } from "replicache";
import { z } from "zod";
import {
	type Affected,
	getClient,
	getClientGroup,
	putClient,
	putClientGroup,
} from "./lib/data";
import { db } from "./db";
import { type Mutation, mutationSchema, mutate } from "./lib/mutate";
import { getPokeBackend } from "./poke";

const pushRequestSchema = z.object({
	clientGroupID: z.string(),
	mutations: z.array(mutationSchema),
});

export async function handlePush(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const userID = "000000000000000000000";
		await push(userID, req.body);
		res.status(200).json({});
	} catch (e) {
		next(e);
	}
}

export async function push(userID: string, requestBody: ReadonlyJSONValue) {
	console.log("Processing push", JSON.stringify(requestBody, null, ""));

	const push = pushRequestSchema.parse(requestBody);

	const t0 = Date.now();

	const allAffected = {
		conversationIDs: new Set<string>(),
		userIDs: new Set<string>(),
	};

	for (const mutation of push.mutations) {
		try {
			const affected = await processMutation(
				userID,
				push.clientGroupID,
				mutation,
				false,
			);
			for (const listID of affected.conversationIDs) {
				allAffected.conversationIDs.add(listID);
			}
			for (const userID of affected.userIDs) {
				allAffected.userIDs.add(userID);
			}
		} catch (e) {
			await processMutation(userID, push.clientGroupID, mutation, true);
		}
	}

	const pokeBackend = getPokeBackend();

	for (const conversationID of allAffected.conversationIDs) {
		pokeBackend.poke(`conversation/${conversationID}`);
	}
	for (const userID of allAffected.userIDs) {
		pokeBackend.poke(`user/${userID}`);
	}

	console.log("Processed all mutations in", Date.now() - t0);
}

async function processMutation(
	userID: string,
	clientGroupID: string,
	mutation: Mutation,
	// 1. `let errorMode = false` (implemented via function arg)
	errorMode: boolean,
) {
	return await db.transaction(async (tx) => {
		let affected: Affected = { conversationIDs: [], userIDs: [] };

		console.log(
			"Processing mutation",
			errorMode ? "errorMode" : "",
			JSON.stringify(mutation, null, ""),
		);

		// 3. `getClientGroup(body.clientGroupID)`
		// 4. Verify requesting user owns cg (in function)
		const clientGroup = await getClientGroup(tx, clientGroupID, userID);

		// 5. `getClient(mutation.clientID)`
		// 6. Verify requesting client group owns requested client
		const baseClient = await getClient(tx, mutation.clientID, clientGroupID);

		// 7. init nextMutationID
		const nextMutationID = baseClient.lastMutationID + 1;

		// 8. rollback and skip if already processed.
		if (mutation.id < nextMutationID) {
			console.log(
				`Mutation ${mutation.id} has already been processed - skipping`,
			);
			return affected;
		}

		// 9: Rollback and error if from future.
		if (mutation.id > nextMutationID) {
			throw new Error(`Mutation ${mutation.id} is from the future - aborting`);
		}

		const t1 = Date.now();

		if (!errorMode) {
			try {
				// 10(i): Run business logic
				// 10(i)(a): xmin column is automatically updated by Postgres for any
				//   affected rows.
				affected = await mutate(tx, userID, mutation);
			} catch (e) {
				// 10(ii)(a-c): log error, abort, and retry
				console.error(
					`Error executing mutation: ${JSON.stringify(mutation)}: ${e}`,
				);
				throw e;
			}
		}

		// 11-12: put client and client group
		const nextClient = {
			id: mutation.clientID,
			clientGroupID,
			lastMutationID: nextMutationID,
		};

		await Promise.all([
			putClientGroup(tx, clientGroup),
			putClient(tx, nextClient),
		]);

		console.log("Processed mutation in", Date.now() - t1);

		return affected;
	});
}
