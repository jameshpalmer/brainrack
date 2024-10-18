import { createFileRoute } from "@tanstack/react-router";
import { useSubscribe } from "replicache-react";
import { messagesByConversation } from "../../lib/utils/conversation";
import { useRef } from "react";
import type { Message } from "shared";
import { nanoid } from "nanoid";
import { useEventSourcePoke } from "../../hooks/websockets/event-poke-source";

export const Route = createFileRoute(
	"/(conversation)/_c/conversation/$conversationId",
)({
	component: Messages,
});

export function Messages() {
	const { replicache } = Route.useRouteContext();
	const { conversationId } = Route.useParams();

	useEventSourcePoke(replicache, `conversation/${conversationId}`);

	const usernameRef = useRef<HTMLInputElement>(null);
	const contentRef = useRef<HTMLInputElement>(null);

	const messages = useSubscribe(
		replicache,
		async (tx) => messagesByConversation(tx, conversationId),
		{ default: null },
	);

	if (messages === null) {
		return <div>Loading...</div>;
	}

	messages.sort((a, b) => (b[1].ord ?? 0) - (a[1].ord ?? 0));
	console.log(messages);

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		let last: Message | null = null;
		if (messages.length) {
			const lastMessageTuple = messages[0];
			last = lastMessageTuple[1];
		}
		const ord = (last?.ord ?? 0) + 1;
		const username = usernameRef.current?.value ?? "";
		const content = contentRef.current?.value ?? "";

		await replicache?.mutate.createMessage({
			id: nanoid(),
			conversationID: conversationId,
			sender: username,
			content,
			ord,
		});

		if (contentRef.current) {
			contentRef.current.value = "";
		}
	};

	return (
		<>
			<form onSubmit={onSubmit}>
				<input ref={usernameRef} required /> says:
				<input ref={contentRef} required />
				<input type="submit" />
			</form>
			<div className="flex flex-col">
				{messages.map(([key, message]) => (
					<div key={key} className="flex gap-2">
						<p>{message.sender}:</p>
						<p>{message.content}</p>
					</div>
				))}
			</div>
		</>
	);
}
