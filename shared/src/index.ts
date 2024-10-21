import type * as schema from "./schema";

export type WordGroup = schema.WordGroup;
export type Conversation = schema.Conversation;
export type Message = schema.Message;
export type User = schema.User;
export type ReplicacheClient = schema.ReplicacheClient;

export type Alphagram = {
	a: string; // alphagram
	ws: string[]; // wordIDs
	cs: number; // cswWords
	ns: number; // nwlWords
};

export type Word = {
	w: string; // word
	a: string; // alphagrams
	d: string | null; // definition
	cv: boolean; // is valid in CSW
	nv: boolean; // is valid in NWL
	p: number; // playability
};
