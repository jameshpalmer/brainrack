import { useEffect } from "react";
import type { Replicache } from "replicache";
import type { mutators } from "../../mutators";

export function useEventSourcePoke(
	rep: Replicache<typeof mutators>,
	channel: string,
) {
	useEffect(() => {
		const ev = new EventSource(`/api/replicache/poke?channel=${channel}`);
		ev.onmessage = () => {
			void rep.pull();
		};
		return () => ev.close();
	}, [rep, channel]);
}
