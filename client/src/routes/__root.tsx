import {
	createRootRouteWithContext,
	Link,
	Outlet,
} from "@tanstack/react-router";
import type { Replicache } from "replicache";
import type { mutators } from "../mutators";
import type { User } from "shared";
import { useEventSourcePoke } from "../hooks/websockets/event-poke-source";

export interface RouterContext {
	replicache: Replicache<typeof mutators>;
	user: User;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: Root,
});

function Root() {
	const { replicache, user } = Route.useRouteContext();

	useEventSourcePoke(replicache, `user/${user.id}`);

	return (
		<>
			<div className="flex gap-2 p-2">
				<Link to="/" className="[&.active]:font-bold">
					Home
				</Link>{" "}
				<Link to="/about" className="[&.active]:font-bold">
					About
				</Link>
				<Link to="/conversations" className="[&.active]:font-bold">
					Conversations
				</Link>
			</div>
			<hr />
			<Outlet />
		</>
	);
}
