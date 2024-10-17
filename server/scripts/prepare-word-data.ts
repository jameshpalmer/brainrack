import betterSqlite3 from "better-sqlite3";
import { client, db, wordTable, alphagramTable } from "../src/db";
import type { Word } from "./data/types";
import { nanoid } from "nanoid";

async function main() {
	db.delete(wordTable);
	db.delete(alphagramTable);

	const nwl2023 = betterSqlite3("scripts/data/NWL2023.db"); // This one contains definitions
	const nwl2023Rows = nwl2023
		.prepare(
			"SELECT word, definition, playability, alphagram, length FROM words WHERE length = 7",
		)
		.all() as Word[];

	const csw21 = betterSqlite3("scripts/data/CSW21.db");
	const csw21Rows = csw21
		.prepare(
			"SELECT word, definition, playability, alphagram, length FROM words WHERE length = 7",
		)
		.all() as Word[];

	const words = new Map<string, typeof wordTable.$inferInsert>();
	const alphagrams = new Map<string, typeof alphagramTable.$inferInsert>();

	for (const row of nwl2023Rows) {
		let rowAlphagram = alphagrams.get(row.alphagram);
		if (!rowAlphagram) {
			rowAlphagram = {
				id: nanoid(),
				alphagram: row.alphagram,
				length: row.length,
				nwlWords: 1,
				cswWords: 0,
			};
			alphagrams.set(row.alphagram, rowAlphagram);
		} else {
			alphagrams.set(row.alphagram, {
				...rowAlphagram,
				nwlWords: rowAlphagram.nwlWords + 1,
			});

			words.set(row.word, {
				id: nanoid(),
				word: row.word,
				definition: row.definition,
				cswValid: false,
				nwlValid: true,
				playability: row.playability,
				alphagramID: rowAlphagram.id,
			});
		}
	}

	for (const row of csw21Rows) {
		let rowAlphagram = alphagrams.get(row.alphagram);
		if (!rowAlphagram) {
			rowAlphagram = {
				id: nanoid(),
				alphagram: row.alphagram,
				length: row.length,
				nwlWords: 0,
				cswWords: 1,
			};
			alphagrams.set(row.alphagram, rowAlphagram);
		} else {
			alphagrams.set(row.alphagram, {
				...rowAlphagram,
				cswWords: rowAlphagram.cswWords + 1,
			});
		}

		const existingWord = words.get(row.word);
		if (existingWord) {
			words.set(row.word, {
				...existingWord,
				cswValid: true,
			});
		} else {
			words.set(row.word, {
				id: nanoid(),
				word: row.word,
				definition: row.definition,
				cswValid: true,
				nwlValid: false,
				playability: row.playability,
				alphagramID: rowAlphagram.id,
			});
		}
	}

	// need to batch insert due to active bug in drizzle-orm: #1740
	const batchInsert = async (
		items: (
			| typeof wordTable.$inferInsert
			| typeof alphagramTable.$inferInsert
		)[],
		table: typeof wordTable | typeof alphagramTable,
	) => {
		const batchSize = 1000;
		const batches: Promise<typeof items>[] = [];
		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);
			const insert = db.insert(table).values(batch).returning();
			batches.push(insert);
		}

		await Promise.all(batches);
	};

	await batchInsert(Array.from(alphagrams.values()), alphagramTable);
	await batchInsert(Array.from(words.values()), wordTable);

	// close connections
	csw21.close();
	nwl2023.close();
	await client.end();
}

await main();
