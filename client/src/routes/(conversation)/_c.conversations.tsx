import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(conversation)/_c/conversations")({
	component: Conversations,
});

export function Conversations() {
	return null;
}
