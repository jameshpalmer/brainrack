import type { User } from "shared";

export function useAuth() {
	const user: User = { id: "000000000000000000000", name: "James" };

	return user;
}
