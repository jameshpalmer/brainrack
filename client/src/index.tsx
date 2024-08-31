import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Replicache, TEST_LICENSE_KEY } from "replicache";
import { App } from "./App";
import { mutators } from "./mutators";

async function init() {
	const licenseKey =
		import.meta.env.VITE_REPLICACHE_LICENSE_KEY || TEST_LICENSE_KEY;
	if (!licenseKey) {
		throw new Error("Missing VITE_REPLICACHE_LICENSE_KEY");
	}

	function Root() {
		const [r, setR] = useState<Replicache<typeof mutators> | null>(null);

		useEffect(() => {
			console.log("updating replicache");
			const r = new Replicache({
				name: "chat-user-id",
				licenseKey,
				mutators,
				pushURL: "/api/replicache/push",
				pullURL: "/api/replicache/pull",
				logLevel: "debug",
			});
			setR(r);
			return () => {
				void r.close();
			};
		}, []);

		return r && <App replicache={r} />;
	}

	ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
		<React.StrictMode>
			<Root />
		</React.StrictMode>,
	);
}

await init();
