import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
