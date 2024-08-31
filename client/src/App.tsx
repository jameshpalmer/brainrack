import { nanoid } from "nanoid";
import { useRef } from "react";
import type { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import type { Message } from "shared";
import { useEventSourcePoke } from "./hooks/websockets/event-poke-source";
import type { mutators } from "./mutators";

export function App({
	replicache,
}: { replicache: Replicache<typeof mutators> }) {
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
			{messages.map(([k, v]) => (
				<div key={k}>
					<b>{v.from}: </b>
					{v.content}
				</div>
			))}
		</div>
	);
}
