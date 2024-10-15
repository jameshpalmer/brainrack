import {
	createRootRouteWithContext,
	Link,
	Outlet,
} from "@tanstack/react-router";
import type { Replicache } from "replicache";
import type { mutators } from "../mutators";

export interface RouterContext {
	replicache: Replicache<typeof mutators>;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: () => (
		<>
			<div className="flex gap-2 p-2">
				<Link to="/" className="[&.active]:font-bold">
					Home
				</Link>{" "}
				<Link to="/about" className="[&.active]:font-bold">
					About
				</Link>
			</div>
			<hr />
			<Outlet />
		</>
	),
});
