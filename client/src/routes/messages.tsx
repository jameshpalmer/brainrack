import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useEventSourcePoke } from "../hooks/websockets/event-poke-source";
import { useSubscribe } from "replicache-react";
import type { Conversation } from "shared";

export const Route = createFileRoute("/messages")({
	component: Messages,
});

export function Messages() {
	const { replicache } = useRouteContext({
		from: "/messages",
	});

	// Listen for pokes related to the docs this user has access to.
	useEventSourcePoke("/api/replicache/poke?channel=1", replicache);

	const conversations = useSubscribe(
		replicache,
		async (tx) => {
			const list = await tx
				.scan<Conversation>({ prefix: "conversation/" })
				.entries()
				.toArray();
			return list;
		},
		{ default: [] },
	);

	console.log(conversations);

	return null;
}
