import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { Replicache, TEST_LICENSE_KEY } from "replicache";
import { mutators } from "./mutators";
import "./index.css";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

const licenseKey =
	import.meta.env.VITE_REPLICACHE_LICENSE_KEY || TEST_LICENSE_KEY;
if (!licenseKey) {
	throw new Error("Missing VITE_REPLICACHE_LICENSE_KEY");
}

const replicache = new Replicache({
	name: "chat-user-id",
	licenseKey,
	mutators,
	pushURL: "/api/replicache/push",
	pullURL: "/api/replicache/pull",
	logLevel: "debug",
});

const router = createRouter({
	routeTree,
	context: {
		replicache,
	},
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

async function init() {
	// Create a new router instance

	// Render the app
	const rootElement = document.getElementById("root");

	if (rootElement && !rootElement?.innerHTML) {
		const root = ReactDOM.createRoot(rootElement);
		root.render(
			<StrictMode>
				<RouterProvider router={router} />
			</StrictMode>,
		);
	}
}

await init();
