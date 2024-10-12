import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useEventSourcePoke } from "../hooks/websockets/event-poke-source";
import { useSubscribe } from "replicache-react";
import type { Message } from "shared";
import { useRef } from "react";
import { nanoid } from "nanoid";

export const Route = createFileRoute("/messages")({
	component: Messages,
});

export function Messages() {
	const { replicache } = useRouteContext({
		from: "/messages",
	});

	// Listen for pokes related to the docs this user has access to.
	useEventSourcePoke("/api/replicache/poke?channel=1", replicache);

	const messages = useSubscribe(
		replicache,
		async (tx) => {
			const list = await tx
				.scan<Message>({ prefix: "message/" })
				.entries()
				.toArray();
			list.sort(([, { order: a }], [, { order: b }]) => a - b);
			return list;
		},
		{ default: [] },
	);
	console.log(messages);

	const usernameRef = useRef<HTMLInputElement>(null);
	const contentRef = useRef<HTMLInputElement>(null);

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		let last: Message | null = null;
		if (messages.length) {
			const lastMessageTuple = messages[messages.length - 1];
			last = lastMessageTuple[1];
		}
		const order = (last?.order ?? 0) + 1;
		const username = usernameRef.current?.value ?? "";
		const content = contentRef.current?.value ?? "";

		await replicache?.mutate.createMessage({
			id: nanoid(),
			from: username,
			content,
			order,
		});

		if (contentRef.current) {
			contentRef.current.value = "";
		}
	};

	return (
		<div>
			<form onSubmit={onSubmit}>
				<input ref={usernameRef} required /> says:
				<input ref={contentRef} required /> <input type="submit" />
			</form>
			<div className="flex w-fit flex-col-reverse">
				{messages.map(([k, v]) => (
					<div key={k} className="flex w-fit">
						<b>{v.from}: </b>
						{v.content}
					</div>
				))}
			</div>
		</div>
	);
}
