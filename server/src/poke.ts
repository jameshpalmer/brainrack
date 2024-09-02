import type Express from "express";

export function getPokeBackend() {
	// The SSE impl has to keep process-wide state using the global object.
	// Otherwise the state is lost during hot reload in dev.
	const global = globalThis as unknown as {
		_pokeBackend: PokeBackend;
	};
	if (!global._pokeBackend) {
		global._pokeBackend = new PokeBackend();
	}
	return global._pokeBackend;
}

type Listener = () => void;
type ListenerMap = Map<string, Set<Listener>>;

// Implements the poke backend using server-sent events.
class PokeBackend {
	private _listeners: ListenerMap;

	constructor() {
		this._listeners = new Map();
	}

	addListener(channel: string, listener: () => void) {
		let set = this._listeners.get(channel);
		if (!set) {
			set = new Set();
			this._listeners.set(channel, set);
		}
		set.add(listener);
		return () => this._removeListener(channel, listener);
	}

	poke(channel: string) {
		const set = this._listeners.get(channel);
		if (!set) {
			return;
		}
		for (const listener of set) {
			try {
				listener();
			} catch (e) {
				console.error(e);
			}
		}
	}

	private _removeListener(channel: string, listener: () => void) {
		const set = this._listeners.get(channel);
		if (!set) {
			return;
		}
		set.delete(listener);
	}
}

export async function handlePoke(
	req: Express.Request,
	res: Express.Response,
): Promise<void> {
	if (req.query.channel === undefined) {
		res.status(400).send("Missing channel");
		return;
	}
	const { channel } = req.query;

	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
	res.setHeader("Cache-Control", "no-cache, no-transform");
	res.setHeader("X-Accel-Buffering", "no");

	res.write(`id: ${Date.now()}\n`);
	res.write("data: hello\n\n");

	const pokeBackend = getPokeBackend();

	const unlisten = pokeBackend.addListener(channel as string, () => {
		console.log(`Sending poke for channel ${channel}`);
		res.write(`id: ${Date.now()}\n`);
		res.write("data: poke\n\n");
	});

	setInterval(() => {
		res.write(`id: ${Date.now()}\n`);
		res.write("data: beat\n\n");
	}, 1000 * 30);

	res.on("close", () => {
		console.log("Closing poke connection");
		unlisten();
	});
}
