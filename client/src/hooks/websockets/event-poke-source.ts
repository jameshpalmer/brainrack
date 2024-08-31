import { useEffect } from "react";
import type { Replicache } from "replicache";
import type { mutators } from "../../mutators";

export function useEventSourcePoke(
	url: string,
	rep: Replicache<typeof mutators>,
) {
	useEffect(() => {
		const ev = new EventSource(url);
		ev.onmessage = () => {
			void rep.pull();
		};
		return () => ev.close();
	}, [url, rep]);
}
