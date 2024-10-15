import type { NextFunction, Request, Response } from "express";
import type { PatchOperation } from "replicache";
import { transaction } from "./db";
import { z } from "zod";
import {
	type CVREntries,
	cvrEntriesFromSearch,
	diffCVR,
	isCVRDiffEmpty,
	type CVR,
} from "./lib/cvr";
import {
	getClientGroup,
	getConversations,
	getMessages,
	putClientGroup,
	searchClients,
	searchConversations,
	searchMessages,
} from "./lib/data";
import { nanoid } from "nanoid";

const cookie = z.object({
	order: z.number(),
	cvrID: z.string(),
});

type Cookie = z.infer<typeof cookie>;

const pullRequest = z.object({
	clientGroupId: z.string(),
	cookie: z.union([cookie, z.null()]),
});

export async function handlePull(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const userId = z.string().parse(req.query.userID);
		const resp = await pull(userId, req.body);
		res.json(resp);
	} catch (e) {
		next(e);
	}
}

// cvrKey -> ClientViewRecord
const cvrCache = new Map<string, CVR>();

// New pull - row versioning strategy
// https://doc.replicache.dev/strategies/row-version#pull
async function pull(userId: string, requestBody: Express.Request) {
	console.log(`Processing pull ${JSON.stringify(requestBody, null, "")}`);

	const pull = pullRequest.parse(requestBody);

	const { clientGroupId } = pull;

	// 1. Fetch prevCVR
	const prevCVR = pull.cookie ? cvrCache.get(pull.cookie.cvrID) : undefined;
	// 2. Init baseCVR - if prevCVR exists, use it, otherwise create a new one
	const baseCVR = prevCVR ?? {};
	console.log({ prevCVR, baseCVR });

	// 3. Begin transaction
	const txResult = await transaction(async (tx) => {
		// 4-5. Get client group & check authorization
		const baseClientGroupRecord = await getClientGroup(
			tx,
			clientGroupId,
			userId,
		);

		// 6. Read all domain data, ids and versions
		const [conversationMeta, messageMeta, clientMeta] = await Promise.all([
			// 6. Read all domain data, just ids and versions
			searchConversations(tx, userId),
			searchMessages(tx, userId),
			// 7. Read all clients in CG
			searchClients(tx, clientGroupId),
		]);

		console.log({
			baseClientGroupRecord,
			conversationMeta,
			messageMeta,
			clientMeta,
		});

		// 8. Build nextCVR
		const nextCVR: CVR = {
			conversation: cvrEntriesFromSearch(conversationMeta),
			message: cvrEntriesFromSearch(messageMeta),
			client: cvrEntriesFromSearch(clientMeta),
		};

		console.log({ nextCVR });

		// 9. Calculate diffs
		const diff = diffCVR(baseCVR, nextCVR);

		// 10. If diff is empty, return no-op PR
		if (prevCVR && isCVRDiffEmpty(diff)) {
			return null;
		}

		// 11. Get lists of entities
		const [conversations, messages] = await Promise.all([
			getConversations(tx, diff.conversation.puts),
			getMessages(tx, diff.message.puts),
		]);

		console.log({ conversations, messages });

		// 12. changed clients - no need to re-read clients from database,
		// we already have their versions.
		const clients: CVREntries = {};
		for (const clientID of diff.client.puts) {
			clients[clientID] = nextCVR.client[clientID];
		}
		console.log({ clients });

		// 13: get newCVRVersion
		const baseCVRVersion = pull.cookie?.order ?? 0;
		const nextCVRVersion =
			Math.max(baseCVRVersion, baseClientGroupRecord.cvrVersion) + 1;

		// 14: Write ClientGroupRecord
		const nextClientGroupRecord = {
			...baseClientGroupRecord,
			cvrVersion: nextCVRVersion,
		};
		console.log({ nextClientGroupRecord });
		await putClientGroup(tx, nextClientGroupRecord);

		return {
			entities: {
				conversation: { dels: diff.conversation.dels, puts: conversations },
				messages: { dels: diff.message.dels, puts: messages },
			},
			clients,
			nextCVR,
			nextCVRVersion,
		};
	});

	// 10: If diff is empty, return no-op PR
	if (txResult === null) {
		return {
			cookie: pull.cookie,
			lastMutationIDChanges: {},
			patch: [],
		};
	}

	const { entities, clients, nextCVR, nextCVRVersion } = txResult;

	// 16-17. Store cvr
	const cvrID = nanoid();
	cvrCache.set(cvrID, nextCVR);

	// 18(i). Build patch
	const patch: PatchOperation[] = [];
	if (prevCVR === undefined) {
		patch.push({ op: "clear" });
	}

	for (const [name, { puts, dels }] of Object.entries(entities)) {
		for (const id of dels) {
			patch.push({ op: "del", key: `${name}/${id}` });
		}
		for (const entity of puts) {
			patch.push({
				op: "put",
				key: `${name}/${entity.id}`,
				value: entity,
			});
		}
	}

	// 18(ii). construct cookie
	const cookie: Cookie = {
		order: nextCVRVersion,
		cvrID,
	};

	// 18(iii).
	const lastMutationIDChanges = clients;

	return {
		cookie,
		lastMutationIDChanges,
		patch,
	};
}
