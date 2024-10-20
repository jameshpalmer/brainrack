import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEventSourcePoke } from "../../hooks/websockets/event-poke-source";
import { useSubscribe } from "replicache-react";
import type { Conversation, Word } from "shared";

export const Route = createFileRoute("/(conversation)/_c")({
	component: ConversationLayout,
});

function ConversationLayout() {
	const { replicache } = Route.useRouteContext();

	// Listen for pokes related to the docs this user has access to.
	useEventSourcePoke(replicache, "1");

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

	const words = useSubscribe(
		replicache,
		async (tx) => {
			const list = await tx
				.scan<Word>({ prefix: "words/" })
				.entries()
				.toArray();
			return list;
		},
		{ default: [] },
	);

	console.log(words);

	return (
		<div className="p-2">
			{conversations.map((conversation) => (
				<Link
					key={conversation[1].id}
					to="/conversation/$conversationId"
					params={{ conversationId: conversation[1].id }}
					className="[&.active]:font-bold"
				>
					{conversation[1].id}
				</Link>
			))}
			<Outlet />
		</div>
	);
}
